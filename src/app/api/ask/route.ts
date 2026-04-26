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

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";

const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

// --- RATE LIMITING ---
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;
const ipRequests = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequests.get(ip);
  if (!record || record.resetTime < now) {
      ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return true;
  }
  if (record.count >= MAX_REQUESTS) {
      return false;
  }
  record.count++;
  return true;
}

const LARGE_MODEL = "openai/gpt-oss-120b"; 

const ANALYTICS_TABLE = "app_analytics";
const HISTORY_TABLE = "chat_history"; 

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

async function getWebContext(query: string): Promise<string> {
  if (!tvly || isTavilyQuotaExceeded) return "";
  
  try {
    const searchResult = await tvly.search(`${query} ${TRUSTED_SOURCES}`, {
      searchDepth: "basic", 
      includeImages: false, 
      maxResults: 3,
    });
    
    if (!searchResult || !searchResult.results) return "";

    let contextStr = "\n-- TRUSTED WEB GUIDELINES (SOURCE D - DO NOT CITE SPECIFICALLY) --\n";
    contextStr += searchResult.results.map((r) => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n");
    contextStr += "\n------------------------------------------\n";
    return contextStr;

  } catch (e) {
    console.error("[Umbil] Search failed (disabling search for this instance):", e);
    isTavilyQuotaExceeded = true;
    return "";
  }
}

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "TOGETHER_API_KEY not set" }, { status: 500 });

  const userId = await getUserId(req);
  const deviceId = req.headers.get("x-device-id") || "unknown";

  if (!userId) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || deviceId;
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "You've reached the free limit of 10 queries per hour. Please create a free account to continue using Umbil." }, 
        { status: 429 }
      );
    }
  }

  try {
    const { messages, profile, answerStyle, saveToHistory, conversationId } = await req.json();

    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400 });

    const latestUserMessage = messages[messages.length - 1];
    const userContent = latestUserMessage.content;

    const [localContext, academicContext, webContext] = await Promise.all([
        getLocalContext(userContent),
        getAcademicContext(userContent),
        getWebContext(userContent)
    ]);

    const combinedContext = `
${localContext}
${academicContext}
${webContext}
    `.trim();
    
    const gradeNote = profile?.grade ? ` User grade: ${profile.grade}.` : "";
    const styleModifier = getStyleModifier(answerStyle);
    
    const customInstructions = profile?.custom_instructions 
        ? `\n\nUSER PREFERENCES (STRICTLY FOLLOW):\n"${profile.custom_instructions}"\n` 
        : "";

    const safetyAndLocationInstructions = `
    *** CRITICAL UK NHS IDENTITY PROTOCOLS ***
    1. LOCATION LOCK (UK ONLY): You are a UK CLINICAL ASSISTANT. You DO NOT use US terminology.
    2. GUIDELINE SUPREMACY (NICE/BNF): Your internal knowledge MUST align with NICE guidelines.
    3. SPECIFIC CLINICAL TRAPS (DO NOT FAIL THESE):
       - Bronchiolitis: DO NOT suggest bronchodilators/steroids (NICE NG9).
       - Cystitis (Women): Standard is 3 DAYS.
       - Otitis Media: First line is "Analgesia + Watch & Wait".
    4. CITATION RULES: Format citations exactly as: [Source Name].
    `;

    const fullSystemPrompt = `
${SYSTEM_PROMPTS.ASK_BASE}
${styleModifier}
${gradeNote}
${safetyAndLocationInstructions}
${customInstructions}

--- COLLECTED CONTEXT ---
${combinedContext}
-------------------------
`.trim();

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

            await logAnalytics(userId, "question_asked", { 
                cache: "direct_stream",
                total_tokens: safeTotalTokens, 
                style: answerStyle || 'standard',
                device_id: deviceId,
                sources_used: {
                    local: !!localContext,
                    academic: !!academicContext,
                    web: !!webContext
                }
            });

            if (userId && latestUserMessage.role === 'user' && saveToHistory) {
                try {
                    const tasks = [];
                    tasks.push(supabaseService.from(HISTORY_TABLE).insert({ 
                        user_id: userId, 
                        conversation_id: conversationId, 
                        question: latestUserMessage.content, 
                        answer: finalAnswer 
                    }));
                    tasks.push(updateMemory(userId, latestUserMessage.content, profile?.custom_instructions));
                    await Promise.allSettled(tasks);
                } catch (bgError) {
                    console.error("[Umbil] Critical background task error:", bgError);
                }
            }
        },
    });

    return result.toTextStreamResponse({ headers: { "X-Response-Type": "DIRECT_STREAM" } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}