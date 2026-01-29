// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { createHash } from "crypto";
import { streamText, generateText } from "ai"; 
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPTS, STYLE_MODIFIERS, TEST_RAG_PROMPT } from "@/lib/prompts";
import { searchKnowledgeBase, formatContextForLLM, formatSources } from '@/lib/rag-search';

// Node.js runtime required for network checks
// export const runtime = 'edge'; 

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";

const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

const MODEL_SLUG = "openai/gpt-oss-120b";
// const INTENT_MODEL_SLUG = "meta-llama/Llama-3-8b-chat-hf"; // PARKED

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

/* --- IMAGE FEATURE PARKED FOR NOW ---
// --- Intent Detection ---
async function detectImageIntent(query: string): Promise<boolean> {
  const q = query.toLowerCase();
  const imageKeywords = /(image|picture|photo|diagram|illustration|look like|show me|appearance|rash|lesion|visible|ecg|x-ray|scan)/i;
  
  const hasKeyword = imageKeywords.test(q);
  console.log(`[Umbil] Image Intent Check: "${q}" -> Regex Match: ${hasKeyword}`);

  if (hasKeyword) return true; 
  return false;
}

// --- Image Validation & Filtering ---
function isGenericImage(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("logo") || 
         lower.includes("icon") || 
         lower.includes("banner") || 
         lower.includes("placeholder") ||
         lower.includes("button") ||
         lower.includes("footer");
}

async function validateImage(url: string): Promise<boolean> {
  if (isGenericImage(url)) return false;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); 
    const res = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 ...' } 
    });
    clearTimeout(id);
    return res.ok; 
  } catch (e) {
    return false;
  }
}
------------------------------------ */

// --- Web Context Construction (Text Only Version) ---
async function getWebContext(query: string): Promise<{ text: string, error?: string }> {
  if (!tvly) return { text: "" };
  
  try {
    // Tavily Search (Trusted Sources Only)
    // "Basic" depth (1 credit) - IMAGES DISABLED
    const searchResult = await tvly.search(`${query} ${TRUSTED_SOURCES}`, {
      searchDepth: "basic", 
      includeImages: false, // Forces text-only search
      maxResults: 3,
    });
    
    let contextStr = "\n\n--- REAL-TIME CONTEXT FROM TRUSTED GUIDELINES ---\n";
    contextStr += searchResult.results.map((r) => `Source: ${r.url}\nContent: ${r.content}`).join("\n\n");

    /* --- PARKED IMAGE LOGIC ---
    if (wantsImage && searchResult.images && searchResult.images.length > 0) {
      // ... (Validation and formatting logic preserved in comments if needed later)
    }
    ----------------------------- */

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
    
    // 1. Detect Intent (PARKED - Default to false)
    // const wantsImage = await detectImageIntent(userContent);
    const wantsImage = false; 

    // RAG search
    const ragResults = await searchKnowledgeBase(userContent, {
      matchThreshold: 0.75,  // Adjust based on your needs
      matchCount: 3,         // Number of chunks to retrieve
    });
    
    const ragContext = formatContextForLLM(ragResults);
    const hasRAGContext = ragResults.length > 0;

    // 2. Get Context (Text Only)
    const { text: context, error: searchError } = await getWebContext(userContent);

    const gradeNote = profile?.grade ? ` User grade: ${profile.grade}.` : "";
    const styleModifier = getStyleModifier(answerStyle);
    
    // 3. Dynamic System Prompt
    let imageInstruction = "";

    /* --- PARKED UMBIL PRO LIMIT MESSAGE --
    // if (searchError === "LIMIT_REACHED") {
    //     imageInstruction = `
    //     IMPORTANT: The external search failed (monthly limit reached).
    //     Apologize: "I cannot retrieve live guidelines right now as the free search limit has been reached. **Umbil Pro** offers unlimited searches."
    //     Then answer based on your internal knowledge.
    //     `;
    // } 
    /* --- PARKED IMAGE INSTRUCTIONS ---
    else if (wantsImage) {
        // ... (Smart image display instructions preserved)
    }
    ----------------------------------- */

    // const systemPrompt = `${SYSTEM_PROMPTS.ASK_BASE}\n${styleModifier}\n${gradeNote}\n${imageInstruction}\n${context}`.trim();
    const systemPrompt = `${TEST_RAG_PROMPT}\n${styleModifier}\n${gradeNote}\n${imageInstruction}\n${ragContext ? `\nKNOWLEDGE BASE CONTEXT:\n${ragContext}\n` : ''}${context}`.trim();

    const cacheKeyContent = JSON.stringify({ model: MODEL_SLUG, query: normalizedQuery, style: answerStyle || 'standard' });
    const cacheKey = sha256(cacheKeyContent);

    const { data: cached } = await supabase.from(CACHE_TABLE).select("answer").eq("query_hash", cacheKey).single();

    if (cached) {
      await logAnalytics(userId, "question_asked", { 
          cache: "hit", 
          style: answerStyle || 'standard',
          device_id: deviceId,
          used_rag: hasRAGContext,
          rag_sources_count: ragResults.length
      });
      
      if (userId && latestUserMessage.role === 'user' && saveToHistory) {
         await supabaseService.from(HISTORY_TABLE).insert({ 
             user_id: userId, 
             conversation_id: conversationId, 
             question: latestUserMessage.content, 
             answer: cached.answer 
         });
      }

      return NextResponse.json({ answer: cached.answer });
    }

    const result = await streamText({
      model: together(MODEL_SLUG), 
      messages: [
        { role: "system", content: systemPrompt }, 
        ...messages.map((m: ClientMessage) => ({ ...m, content: m.role === "user" ? sanitizeQuery(m.content) : m.content })),
      ],
      temperature: 0.2, 
      topP: 0.8,
      async onFinish({ text, usage }) {
        const answer = text.replace(/\n?References:[\s\S]*$/i, "").trim();

        await logAnalytics(userId, "question_asked", { 
            cache: "miss", 
            total_tokens: usage.totalTokens, 
            style: answerStyle || 'standard',
            device_id: deviceId,
            includes_images: wantsImage,
            limit_hit: !!searchError,
            used_rag: hasRAGContext,
            rag_sources_count: ragResults.length
        });

        if (answer.length > 50) {
          await supabaseService.from(CACHE_TABLE).upsert({ query_hash: cacheKey, answer, full_query_key: cacheKeyContent });
        }

        if (userId && latestUserMessage.role === 'user' && saveToHistory) {
            await supabaseService.from(HISTORY_TABLE).insert({ 
                user_id: userId, 
                conversation_id: conversationId, 
                question: latestUserMessage.content, 
                answer: answer 
            });
        }
      },
    });

    // return result.toTextStreamResponse({ headers: { "X-Cache-Status": "MISS" } });

    // ADD: Include RAG sources in response headers (optional)

    const headers = { 
      "X-Cache-Status": "MISS",
      "X-RAG-Used": hasRAGContext.toString(),
      "X-RAG-Sources": ragResults.length.toString(),
    };
    
    return result.toTextStreamResponse({ headers });

  } catch (err: unknown) {
    console.error("[Umbil] Fatal Error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}