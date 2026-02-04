// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { createHash } from "crypto";
import { streamText, generateText } from "ai"; 
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPTS, STYLE_MODIFIERS } from "@/lib/prompts";
import { updateMemory } from "@/lib/memory"; 

// Node.js runtime required for network checks
// export const runtime = 'edge'; 

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";

const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

// --- MODEL ROUTING ---
const LARGE_MODEL = "openai/gpt-oss-120b"; // For reasoning / medical queries
const SMALL_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"; // For formatting / personalization

const CACHE_TABLE = "api_cache";
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

function sha256(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

function sanitizeAndNormalizeQuery(q: string): string {
  return q.replace(/\b(john|jane|smith|mr\.|ms\.|mrs\.)\s+\w+/gi, "patient")
          .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "a specific date")
          .replace(/\b\d{6,10}\b/g, "an identifier")
          .replace(/\b(\d{1,3})\s+year\s+old\s+(male|female|woman|man|patient)\b/gi, "$1-year-old patient")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
}

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

// --- Web Context Construction (Text Only Version) ---
async function getWebContext(query: string): Promise<{ text: string, error?: string }> {
  if (!tvly) return { text: "" };
  
  try {
    const searchResult = await tvly.search(`${query} ${TRUSTED_SOURCES}`, {
      searchDepth: "basic", 
      includeImages: false, 
      maxResults: 3,
    });
    
    let contextStr = "\n\n--- REAL-TIME CONTEXT FROM TRUSTED GUIDELINES ---\n";
    contextStr += searchResult.results.map((r) => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n");
    contextStr += "\n------------------------------------------\n";
    return { text: contextStr };

  } catch (e) {
    console.error("[Umbil] Search failed (Limit likely reached):", e);
    return { text: "", error: "LIMIT_REACHED" };
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
    const normalizedQuery = sanitizeAndNormalizeQuery(userContent);
    const wantsImage = false; 

    // --- CACHING STRATEGY ---
    // Key excludes custom instructions to allow sharing the "medical answer" across users
    const cacheKeyContent = JSON.stringify({ 
        model: LARGE_MODEL, 
        query: normalizedQuery, 
        style: answerStyle || 'standard' 
        // Note: custom_instructions REMOVED from cache key
    });
    const cacheKey = sha256(cacheKeyContent);

    // Check Cache
    const { data: cached } = await supabase.from(CACHE_TABLE).select("answer").eq("query_hash", cacheKey).single();
    let canonicalAnswer = cached?.answer || null;
    let isCacheHit = !!canonicalAnswer;

    // --- HELPER: Save to History & Analytics ---
    const handlePostResponseActions = async (finalAnswer: string, usage: any, isHit: boolean, limitHit: boolean) => {
        // SAFE TOKEN ACCESS: Handle undefined usage objects
        const safeTotalTokens = usage?.totalTokens || 0;

        await logAnalytics(userId, "question_asked", { 
            cache: isHit ? "hit" : "miss", 
            total_tokens: safeTotalTokens, 
            style: answerStyle || 'standard',
            device_id: deviceId,
            limit_hit: limitHit
        });

        if (userId && latestUserMessage.role === 'user' && saveToHistory) {
            await supabaseService.from(HISTORY_TABLE).insert({ 
                user_id: userId, 
                conversation_id: conversationId, 
                question: latestUserMessage.content, 
                answer: finalAnswer 
            });
            await updateMemory(userId, latestUserMessage.content, profile?.custom_instructions);
        }
    };

    // --- CASE 1: CACHE HIT + NO CUSTOM INSTRUCTIONS ---
    // Fastest path: Return cached answer immediately
    if (isCacheHit && !profile?.custom_instructions) {
        await handlePostResponseActions(canonicalAnswer, {}, true, false);
        return NextResponse.json({ answer: canonicalAnswer });
    }

    // --- CASE 2: CACHE HIT + CUSTOM INSTRUCTIONS ---
    // Cheap path: Use Small Model to format the cached answer
    if (isCacheHit && profile?.custom_instructions) {
        // Stream the formatting process
        const formattingResult = await streamText({
            model: together(SMALL_MODEL),
            messages: [
                { role: "system", content: `You are a medical editor. Re-format the provided clinical answer strictly adhering to these preferences: "${profile.custom_instructions}". Do not change the clinical facts.` },
                { role: "user", content: `Clinical Answer: "${canonicalAnswer}"` }
            ],
            temperature: 0.2,
            async onFinish({ text, usage }) {
               await handlePostResponseActions(text, usage, true, false); // Log as hit (medical reasoning was cached)
            }
        });
        return formattingResult.toTextStreamResponse({ headers: { "X-Cache-Status": "HIT_FORMATTED" } });
    }

    // --- CASE 3: CACHE MISS (Must Generate Canonical Answer) ---
    // We must generate the "Core Medical Answer" first.
    
    // 1. Get Context (Expensive part)
    const { text: context, error: searchError } = await getWebContext(userContent);
    const gradeNote = profile?.grade ? ` User grade: ${profile.grade}.` : "";
    const styleModifier = getStyleModifier(answerStyle);

    // 2. Canonical System Prompt (NO custom instructions here)
    const canonicalSystemPrompt = `${SYSTEM_PROMPTS.ASK_BASE}\n${styleModifier}\n${gradeNote}\n${context}`.trim();
    
    // If we have custom instructions, we generate Canonical (Blocking) -> Then Format (Streaming)
    // This ensures we save the "pure" answer to cache for others.
    if (profile?.custom_instructions) {
        // Step A: Generate Canonical (Blocking - Large Model)
        const { text: generatedCanonical, usage: genUsage } = await generateText({
            model: together(LARGE_MODEL), 
            messages: [
                { role: "system", content: canonicalSystemPrompt }, 
                ...messages.map((m: ClientMessage) => ({ ...m, content: m.role === "user" ? sanitizeQuery(m.content) : m.content })),
            ],
            temperature: 0.2,
        });

        canonicalAnswer = generatedCanonical.replace(/\n?References:[\s\S]*$/i, "").trim();

        // Step B: Cache Canonical Answer
        if (canonicalAnswer.length > 50) {
            await supabaseService.from(CACHE_TABLE).upsert({ query_hash: cacheKey, answer: canonicalAnswer, full_query_key: cacheKeyContent });
        }

        // Step C: Stream Formatting (Small Model)
        const formattingResult = await streamText({
            model: together(SMALL_MODEL),
            messages: [
                { role: "system", content: `You are a medical editor. Re-format the provided clinical answer strictly adhering to these preferences: "${profile.custom_instructions}". Do not change the clinical facts.` },
                { role: "user", content: `Clinical Answer: "${canonicalAnswer}"` }
            ],
            temperature: 0.2,
            async onFinish({ text, usage: fmtUsage }) {
                // FIXED: Safe math for usage tokens to avoid undefined errors
                const genTokens = genUsage?.totalTokens || 0;
                const fmtTokens = fmtUsage?.totalTokens || 0;
                
                await handlePostResponseActions(text, { totalTokens: genTokens + fmtTokens }, false, !!searchError);
            }
        });
        
        return formattingResult.toTextStreamResponse({ headers: { "X-Cache-Status": "MISS_FORMATTED" } });

    } else {
        // --- CASE 4: CACHE MISS + NO INSTRUCTIONS ---
        // Standard path: Stream Large Model directly
        const result = await streamText({
            model: together(LARGE_MODEL), 
            messages: [
                { role: "system", content: canonicalSystemPrompt }, 
                ...messages.map((m: ClientMessage) => ({ ...m, content: m.role === "user" ? sanitizeQuery(m.content) : m.content })),
            ],
            temperature: 0.2, 
            topP: 0.8,
            async onFinish({ text, usage }) {
                const answer = text.replace(/\n?References:[\s\S]*$/i, "").trim();
                
                // Cache the Canonical Answer
                if (answer.length > 50) {
                    await supabaseService.from(CACHE_TABLE).upsert({ query_hash: cacheKey, answer, full_query_key: cacheKeyContent });
                }

                await handlePostResponseActions(answer, usage, false, !!searchError);
            },
        });

        return result.toTextStreamResponse({ headers: { "X-Cache-Status": "MISS" } });
    }

  } catch (err: unknown) {
    console.error("[Umbil] Fatal Error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}