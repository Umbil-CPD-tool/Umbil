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
import { buildTriageTemplateInjection } from "@/lib/digital-triage";
import { checkRateLimit } from "@/lib/rate-limit";
import { CHAT_TOOL_IDS, type ChatToolId } from "@/lib/tools/types";

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";
type ToolIntent = ChatToolId;
type AskIntent = ToolIntent | "standard";

const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

// Set ENABLE_CHAT_RAG=true after the knowledge base has useful chunks. Default off skips
// empty embed → search → rerank + PMC/Tavily work that adds latency with no quality gain.
const ENABLE_CHAT_RAG = process.env.ENABLE_CHAT_RAG === "true";

const LARGE_MODEL = "openai/gpt-oss-120b"; // Together AI serverless

/** Keep recent turns only — long histories inflate TTFT on gpt-oss-120b. */
const MAX_HISTORY_MESSAGES = 8;

const TOOL_INTENTS: ToolIntent[] = [...CHAT_TOOL_IDS];

const TOOL_PROMPT_MAP: Record<ToolIntent, string> = {
  referral: SYSTEM_PROMPTS.TOOLS.REFERRAL,
  safety_netting: SYSTEM_PROMPTS.TOOLS.SAFETY_NETTING,
  digital_triage: SYSTEM_PROMPTS.TOOLS.DIGITAL_TRIAGE,
  discharge_summary: SYSTEM_PROMPTS.TOOLS.DISCHARGE,
  sbar: SYSTEM_PROMPTS.TOOLS.SBAR,
  patient_friendly: SYSTEM_PROMPTS.TOOLS.PATIENT_FRIENDLY,
};

const ANALYTICS_TABLE = "app_analytics";
const HISTORY_TABLE = "chat_history";

const TRUSTED_SOURCES = [
  "site:nice.org.uk",
  "site:bnf.nice.org.uk",
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

function isToolIntent(intent: AskIntent): intent is ToolIntent {
  return TOOL_INTENTS.includes(intent as ToolIntent);
}

/** Collapse whitespace / punctuation noise so typo regexes stay readable. */
function normalizeForIntent(msg: string): string {
  return msg
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[_/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DRAFT_VERB = "(write|draft|generate|create|compose|make|do|give|prep(?:are)?|type)";

/**
 * Fast deterministic pre-check for clear document-drafting requests.
 * Catches misspellings and near-synonyms before the LLM classifier.
 */
function heuristicIntent(userMessage: string): AskIntent | null {
  const t = normalizeForIntent(userMessage);
  // First ~400 chars usually hold the intent phrase; notes follow underneath
  const head = t.slice(0, 400);

  // --- Referral (referal / refferal / referall / "please refer") ---
  if (
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,100}\\b(referr?als?|referals?|refferals?|referalls?)\\b`).test(head) ||
    /\b(referr?al|referal|refferal|referall)\s+(letter|note|to)\b/.test(head) ||
    /\b(gp\s+)?referr?al\s+(letter|to|for)\b/.test(head) ||
    /\bplease\s+refer\b/.test(head) ||
    /\brefer\s+(urgently|under|to)\b[\s\S]{0,50}\b(2ww|urgent|routine|orthop|ent|gastro|cardio|derm|urol|rheum|neuro)/.test(t) ||
    /\b(2ww|urgent\s+suspected\s+cancer)\s+referr?al\b/.test(head)
  ) {
    return "referral";
  }

  // --- Safety netting (saftey netting / safetynetting / safety-net) ---
  if (
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,80}\\b(safte?y|safety)[\\s-]?nett`).test(head) ||
    /\b(safte?y|safety)[\s-]?nett(ing)?s?\b/.test(head) ||
    /\bsafetynett?ing\b/.test(head) ||
    /\bsafety[\s-]?net\s+(advice|letter|note|info|information)\b/.test(head) ||
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,60}\\bred\\s*flags?\\s+(advice|sheet|leaflet|handout)\\b`).test(head)
  ) {
    return "safety_netting";
  }

  // --- Digital triage (triage reply / reply to patient / AccuRx reply) ---
  if (
    /\bdigital[\s-]?triage\b/.test(head) ||
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,80}\\b(triage|triage\\s+reply|triage\\s+response)\\b`).test(head) ||
    /\btriage\s+(this|reply|response|message)\b/.test(head) ||
    /\breply\s+to\s+(the\s+)?patient\b/.test(head) ||
    /\b(patient|accurx)\s+(reply|response|message)\b/.test(head) ||
    /\baccu[\s-]?rx\s+(reply|response|message)\b/.test(head) ||
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,60}\\b(patient\\s+reply|accurx\\s+reply|online\\s+consultation\\s+reply)\\b`).test(head)
  ) {
    return "digital_triage";
  }

  // --- Discharge summary / letter (dischage / discarge / TTO letter) ---
  if (
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,80}\\b(discharg?e|dischage|discarge)\\b`).test(head) ||
    /\b(discharg?e|dischage|discarge)\s+(summary|letter|note|report)\b/.test(head) ||
    /\bttos?\s+(letter|summary)\b/.test(head) ||
    /\bhospital\s+discharge\s+(letter|summary)\b/.test(head)
  ) {
    return "discharge_summary";
  }

  // --- SBAR (s-bar / s.b.a.r / esbar / structured handover) ---
  if (
    /\bs[\s.\-]?b[\s.\-]?a[\s.\-]?r\b/.test(head) ||
    /\besbars?\b/.test(head) ||
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,50}\\b(handover|hand[- ]over)\\b`).test(head) ||
    /\b(structured|urgent|ward|nursing)\s+handover\b/.test(head) ||
    /\bhandover\s+(note|script|for)\b/.test(head)
  ) {
    return "sbar";
  }

  // --- Patient handout / leaflet (PIL / pt info / patient friendly / lay summary) ---
  if (
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,80}\\b(patient|pt\\.?)\\s+(hand\\s*out|handout|leaflet|info|information|guide|sheet)\\b`).test(head) ||
    /\b(patient|pt\.?)[\s-]?(friendly|hand\s*out|handout|leaflet)\b/.test(head) ||
    /\b(patient|pt)\s+info(rmation)?\s+(leaflet|sheet|handout|guide)\b/.test(head) ||
    /\bpils?\b/.test(head) ||
    /\blay\s+(summary|explanation|guide)\b/.test(head) ||
    new RegExp(`${DRAFT_VERB}\\b[\\s\\S]{0,60}\\b(info\\s+leaflet|information\\s+leaflet|patient\\s+guide)\\b`).test(head) ||
    /\bexplain\s+(this|it)\s+to\s+(the\s+)?patient\b/.test(head) ||
    /\bpatient\s+education\s+(sheet|leaflet|handout)\b/.test(head)
  ) {
    return "patient_friendly";
  }

  return null;
}

/**
 * Sync intent only — heuristics catch document tools; everything else is standard Q&A.
 * Skips an extra Together round-trip that was adding ~0.5–2s before first answer tokens.
 * Ambiguous tool phrasing still works via the Tools modal.
 */
function resolveIntent(userMessage: string): AskIntent {
  const heuristic = heuristicIntent(userMessage);
  if (heuristic) {
    console.log("[Umbil] Intent via heuristic:", heuristic);
    return heuristic;
  }
  return "standard";
}

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch { return null; }
}

async function logAnalytics(userId: string | null, eventType: string, metadata: Record<string, unknown>) {
  try { supabaseService.from(ANALYTICS_TABLE).insert({ user_id: userId, event_type: eventType, metadata }).then(() => {});
  } catch { }
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

    // Sync intent (heuristic only) — no LLM round-trip before answer tokens
    const intent = resolveIntent(userContent);
    const toolMode = isToolIntent(intent);
    const recentMessages: ClientMessage[] = messages.slice(-MAX_HISTORY_MESSAGES);

    // --- INSTANT STREAM CONTROLLER ---
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          if (toolMode) {
            controller.enqueue(encoder.encode(`[[TOOL:${intent}]]\n\n`));
          }

          const gradeNote = profile?.grade ? ` User grade: ${profile.grade}.` : "";
          const customInstructions = profile?.custom_instructions 
              ? `\n\nUSER PREFERENCES (STRICTLY FOLLOW):\n"${profile.custom_instructions}"\n` 
              : "";

          let fullSystemPrompt: string;
          let localContext = "";
          let academicContext = "";
          let webContext = "";

          if (toolMode) {
            // Tool intents: use dedicated document prompts (no ASK_BASE / RAG)
            const signerNote = profile?.full_name
              ? `\nSign documents as: ${profile.full_name}${profile.grade ? `, ${profile.grade}` : ""}.\n`
              : "";
            const triageScaffold =
              intent === "digital_triage"
                ? `\n\n${buildTriageTemplateInjection(userContent)}\n`
                : "";
            fullSystemPrompt = `
${TOOL_PROMPT_MAP[intent]}
${triageScaffold}
${gradeNote}
${signerNote}
${customInstructions}
`.trim();
          } else {
            // Resolve RAG only when enabled (KB populated). Default off avoids empty-pipeline latency.
            if (ENABLE_CHAT_RAG) {
              [localContext, academicContext, webContext] = await Promise.all([
                  getLocalContext(userContent),
                  getAcademicContext(userContent),
                  getWebContext(userContent)
              ]);
            }

            const combinedContext = `
${localContext}
${academicContext}
${webContext}
            `.trim();
            
            const styleModifier = getStyleModifier(answerStyle);
            
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

            fullSystemPrompt = `
${SYSTEM_PROMPTS.ASK_BASE}
${styleModifier}
${gradeNote}
${safetyAndLocationInstructions}
${customInstructions}

--- COLLECTED CONTEXT ---
${combinedContext}
-------------------------
`.trim();
          }

          // Initiate the LLM stream (Together AI — openai/gpt-oss-120b)
          const result = await streamText({
              model: together(LARGE_MODEL), 
              messages: [
                  { role: "system", content: fullSystemPrompt }, 
                  ...recentMessages.map((m: ClientMessage) => ({ 
                      ...m, 
                      content: m.role === "user" ? sanitizeQuery(m.content) : m.content 
                  })),
              ],
              temperature: toolMode ? 0.3 : 0.2, 
              topP: 0.8,
          });

          let finalAnswer = "";

          // Pipe the LLM tokens sequentially into our open stream
          for await (const chunk of result.textStream) {
              finalAnswer += chunk;
              controller.enqueue(encoder.encode(chunk));
          }

          // Close the HTTP stream before slow post-stream DB work so the client
          // does not sit on an idle connection (browsers report that as Failed to fetch).
          controller.close();

          // Post-Stream operations
          finalAnswer = finalAnswer.replace(/\n?References:[\s\S]*$/i, "").trim();

          // Persist tool tag with history so reload can reconstruct toolCall
          const answerForHistory = toolMode
            ? `[[TOOL:${intent}]]\n\n${finalAnswer}`
            : finalAnswer;

          // Estimate tokens for DB
          const estimatedTokens = Math.ceil(finalAnswer.length / 4) + Math.ceil(fullSystemPrompt.length / 4);

          // Stream already closed for the client; await persistence so serverless keeps the invoke alive
          await logAnalytics(userId, "question_asked", { 
              cache: toolMode ? "tool_intent_stream" : "direct_stream",
              intent,
              rag_enabled: ENABLE_CHAT_RAG,
              total_tokens: estimatedTokens, 
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
                  await Promise.allSettled([
                      supabaseService.from(HISTORY_TABLE).insert({ 
                          user_id: userId, 
                          conversation_id: conversationId, 
                          question: latestUserMessage.content, 
                          answer: answerForHistory 
                      }),
                      updateMemory(userId, latestUserMessage.content, profile?.custom_instructions),
                  ]);
              } catch (bgError) {
                  console.error("[Umbil] Critical background task error:", bgError);
              }
          }

        } catch (err: unknown) {
          console.error("Stream Error:", err);
          const msg = err instanceof Error ? err.message : "Internal server error";
          try {
            controller.enqueue(encoder.encode(`\n\n⚠️ **Error:** ${msg}`));
          } catch {
            // Controller may already be closed if the client disconnected
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed after a successful stream
          }
        }
      }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Response-Type": "DIRECT_STREAM",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}