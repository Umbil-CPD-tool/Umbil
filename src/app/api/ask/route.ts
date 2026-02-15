// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { streamText } from "ai"; 
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPTS, STYLE_MODIFIERS } from "@/lib/prompts";
import { updateMemory } from "@/lib/memory"; 
import { getLocalContext, getAcademicContext } from "@/lib/rag";

// Node.js runtime required for network checks
// export const runtime = 'edge'; 

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";

const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

// --- MODEL ROUTING ---
// User requested to keep the large reasoning model
const LARGE_MODEL = "openai/gpt-oss-120b"; 

const ANALYTICS_TABLE = "app_analytics";
const HISTORY_TABLE = "chat_history"; 

// Only fetch images from these high-quality medical sources
const TRUSTED_SOURCES = [
  "site:nice.org.uk",
  "site:bnf.nice.org.uk",
  "site:cks.nice.org.uk",
  "site:dermnetnz.org",
  "site:pcds.org.uk",
  "site:cdc.gov",
  "site:nhs.uk"
].join(" OR ");

const together = createTogetherAI({ apiKey: API_KEY });
const tvly = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;

// CIRCUIT BREAKER: If Tavily hits a limit, disable it for this instance to prevent crashes
let isTavilyQuotaExceeded = false;

function sanitizeQuery(q: string): string {
  return q.replace(/\b(john|jane|smith|mr\.|ms\.|mrs\.)\s+\w+/gi, "patient")
          .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "a specific date")
          .replace(/\b\d{6,10}\b/g, "an identifier")
          .replace(/\b(\d{1,3})\s+year\s+old\s+(male|female|woman|man|patient)\b/gi, "$1-year-old patient");
}

const getStyleModifier = (style: AnswerStyle | null): string => {
  return STYLE_MODIFIERS[style || 'standard'] || STYLE_MODIFIERS.standard;
};

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch { return null; }
}

async function logAnalytics(userId: string | null, eventType: string, metadata: Record<string, unknown>) {
  try { supabaseService.from(ANALYTICS_TABLE).insert({ user_id: userId, event_type: eventType, metadata }).then(() => {}); } catch { }
}

// --- Source D: Web Context (Trusted Sources) ---
async function getWebContext(query: string): Promise<string> {
  // If we don't have a key or we already know the limit is hit, skip immediately
  if (!tvly || isTavilyQuotaExceeded) {
    if (isTavilyQuotaExceeded) console.log("[Umbil] Search skipped: Quota previously exceeded.");
    return "";
  }
  
  try {
    const searchResult = await tvly.search(`${query} ${TRUSTED_SOURCES}`, {
      searchDepth: "basic", 
      includeImages: false, 
      maxResults: 3,
    });
    
    // Safety check for malformed results
    if (!searchResult || !searchResult.results) {
        return "";
    }

    let contextStr = "\n-- TRUSTED WEB GUIDELINES (SOURCE D - DO NOT CITE SPECIFICALLY) --\n";
    contextStr += searchResult.results.map((r) => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n");
    contextStr += "\n------------------------------------------\n";
    return contextStr;

  } catch (e) {
    console.error("[Umbil] Search failed (disabling search for this instance):", e);
    // Trip the circuit breaker so we don't try again
    isTavilyQuotaExceeded = true;
    return "";
  }
}

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "TOGETHER_API_KEY not set" }, { status: 500 });

  const userId = await getUserId(req);
  const deviceId = req.headers.get("x-device-id") || "unknown";

  try {
    const { messages, profile, answerStyle, saveToHistory, conversationId } = await req.json();
    
    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400 });

    const latestUserMessage = messages[messages.length - 1];
    const userContent = latestUserMessage.content;

    // --- PARALLEL RETRIEVAL (GATHERING PHASE) ---
    // Source A: Local RAG
    // Source B: Academic (Europe PMC)
    // Source D: Trusted Web (Tavily)
    
    const [localContext, academicContext, webContext] = await Promise.all([
        getLocalContext(userContent),
        getAcademicContext(userContent),
        getWebContext(userContent)
    ]);

    // === INSERT THIS DEBUG BLOCK ===
    console.log("\n⬇️ --- PARALLEL RETRIEVAL DEBUG --- ⬇️");
    console.log(`[Source A] Local RAG: ${localContext ? "✅ Found data" : "❌ Empty"}`);
    console.log(`[Source B] Europe PMC: ${academicContext ? "✅ Found data" : "❌ Empty"}`);
    console.log(`[Source D] Web Search: ${webContext ? "✅ Found data" : "❌ Empty (or limit hit)"}`);
    console.log("⬆️ ---------------------------------- ⬆️\n");
    // ================================
    
    // Construct Context Block (Order A -> B -> D)
    const combinedContext = `
${localContext}
${academicContext}
${webContext}
    `.trim();
    
    // 2. Build System Prompt Components
    const gradeNote = profile?.grade ? ` User grade: ${profile.grade}.` : "";
    const styleModifier = getStyleModifier(answerStyle);
    
    // 3. Inject Memory / Custom Instructions DIRECTLY into System Prompt
    const customInstructions = profile?.custom_instructions 
        ? `\n\nUSER PREFERENCES (STRICTLY FOLLOW):\n"${profile.custom_instructions}"\n` 
        : "";

    // Modified Prompt Logic for Citations
    const citationInstructions = `
CITATION RULES:
1. IF information comes from "LOCAL / PERSONAL GUIDELINES" (Source A) -> CITE IT.
2. IF information comes from "ACADEMIC RESEARCH" (Source B) -> CITE IT.
3. IF information comes from "TRUSTED WEB GUIDELINES" (Source D) -> USE IT BUT DO NOT EXPLICITLY CITE IT (treat as general knowledge).
4. IF information comes from your own knowledge (Source C) -> Standard answer style.
`;

    const fullSystemPrompt = `
${SYSTEM_PROMPTS.ASK_BASE}
${styleModifier}
${gradeNote}
${citationInstructions}
${customInstructions}

--- COLLECTED CONTEXT ---
${combinedContext}
-------------------------
`.trim();

    // 4. Stream Response (Directly from Large Model)
    const result = await streamText({
        model: together(LARGE_MODEL), 
        messages: [
            { role: "system", content: fullSystemPrompt }, 
            ...messages.map((m: ClientMessage) => ({ 
                ...m, 
                content: m.role === "user" ? sanitizeQuery(m.content) : m.content 
            })),
        ],
        temperature: 0.2, 
        topP: 0.8,
        async onFinish({ text, usage }) {
            const finalAnswer = text.replace(/\n?References:[\s\S]*$/i, "").trim();
            const safeTotalTokens = usage?.totalTokens || 0;

            console.log(`[Umbil] Stream finished. Starting background tasks for user: ${userId}`);

            // Log Analytics
            await logAnalytics(userId, "question_asked", { 
                cache: "direct_stream",
                total_tokens: safeTotalTokens, 
                style: answerStyle || 'standard',
                device_id: deviceId,
                // Simple check if any context was returned
                sources_used: {
                    local: !!localContext,
                    academic: !!academicContext,
                    web: !!webContext
                }
            });

            // Save to History & Update Memory (Background Tasks)
            if (userId && latestUserMessage.role === 'user' && saveToHistory) {
                try {
                    const tasks = [];
                    
                    // Task A: Save Chat
                    tasks.push(supabaseService.from(HISTORY_TABLE).insert({ 
                        user_id: userId, 
                        conversation_id: conversationId, 
                        question: latestUserMessage.content, 
                        answer: finalAnswer 
                    }));

                    // Task B: Update Memory (if we have a fresh answer)
                    tasks.push(updateMemory(userId, latestUserMessage.content, profile?.custom_instructions));

                    const results = await Promise.allSettled(tasks);
                    
                    // Check for failures in background tasks
                    results.forEach((res, idx) => {
                        if (res.status === 'rejected') {
                            console.error(`[Umbil] Background task ${idx} failed:`, res.reason);
                        }
                    });
                    console.log(`[Umbil] Background tasks completed.`);
                } catch (bgError) {
                    console.error("[Umbil] Critical background task error:", bgError);
                }
            }
        },
    });

    return result.toTextStreamResponse({ headers: { "X-Response-Type": "DIRECT_STREAM" } });

  } catch (err: unknown) {
    console.error("[Umbil] Fatal Error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}