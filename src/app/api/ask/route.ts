// src/app/api/ask/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { streamText, generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPTS, STYLE_MODIFIERS } from "@/lib/prompts";
import { updateMemory } from "@/lib/memory"; 
import { getLocalContext, getAcademicContext } from "@/lib/rag";

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";
type ToolIntent = "referral" | "safety_netting" | "discharge_summary" | "sbar" | "patient_friendly";
type AskIntent = ToolIntent | "standard";

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
const INTENT_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

const TOOL_INTENTS: ToolIntent[] = [
  "referral",
  "safety_netting",
  "discharge_summary",
  "sbar",
  "patient_friendly",
];

const TOOL_PROMPT_MAP: Record<ToolIntent, string> = {
  referral: SYSTEM_PROMPTS.TOOLS.REFERRAL,
  safety_netting: SYSTEM_PROMPTS.TOOLS.SAFETY_NETTING,
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

function parseIntentLabel(raw: string): AskIntent {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, "")
    .split(/[\s,.\n:]+/)[0] || "";

  if (TOOL_INTENTS.includes(cleaned as ToolIntent)) return cleaned as ToolIntent;
  if (cleaned === "standard") return "standard";

  // Fallback: label may be buried in a short sentence
  const matched = TOOL_INTENTS.find((id) => raw.toLowerCase().includes(id));
  return matched || "standard";
}

async function classifyIntent(userMessage: string): Promise<AskIntent> {
  const heuristic = heuristicIntent(userMessage);
  if (heuristic) {
    console.log("[Umbil] Intent via heuristic:", heuristic);
    return heuristic;
  }

  try {
    const { text } = await generateText({
      model: together(INTENT_MODEL),
      temperature: 0,
      maxOutputTokens: 16,
      prompt: `You classify NHS clinician chat messages for Umbil document tools.

Return EXACTLY one label from this list (no punctuation, no explanation):
referral
safety_netting
discharge_summary
sbar
patient_friendly
standard

Choose a DOCUMENT tool when the user wants something DRAFTED / WRITTEN as a clinical document.
Tolerate typos and near-synonyms. Clinical notes pasted underneath do NOT change the intent.

Typo / synonym guidance:
- referral ← referal, refferal, referall, "referral letter", "please refer", "GP referral", 2WW referral
- safety_netting ← saftey netting, safetynetting, safety-net advice, "red flag advice sheet"
- discharge_summary ← dischage, discarge, discharge letter/note, TTO letter
- sbar ← S-BAR, S.B.A.R, "structured handover", "write a handover"
- patient_friendly ← patient handout, pt leaflet, PIL, patient-friendly, "explain to the patient", lay summary
- standard ← clinical questions, guidelines, differentials, "what are the red flags for X?", management advice (NOT drafting a document)

Examples:
- "Write me a referal letter\\n58M knee pain..." → referral
- "Draft a GP referral to ENT 2WW for..." → referral
- "saftey netting for viral URTI in 3yo" → safety_netting
- "s-bar for peri-arrest bay 4" → sbar
- "pt handout on insomnia" → patient_friendly
- "dischage summary: admitted with..." → discharge_summary
- "What are the red flags for back pain?" → standard
- "NICE guidance for osteoarthritis" → standard
- "How do I manage HTN in T2DM?" → standard

User message:
"""
${userMessage.slice(0, 2000)}
"""

Label:`,
    });

    const intent = parseIntentLabel(text);
    console.log("[Umbil] Intent via LLM:", intent, "raw:", JSON.stringify(text));
    return intent;
  } catch (err) {
    console.error("[Umbil] Intent classification failed, defaulting to standard:", err);
    return "standard";
  }
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

    // Fast intent classification before opening the response stream
    const intent = await classifyIntent(userContent);
    const toolMode = isToolIntent(intent);

    // --- INSTANT STREAM CONTROLLER ---
    // We create a custom readable stream so we can pipe status messages to the client
    // *before* the RAG calls finish resolving.
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // 1. Immediate TTFT signal — tool tag or consulting status
        if (toolMode) {
          controller.enqueue(encoder.encode(`[[TOOL:${intent}]]\n\n`));
        } else {
          controller.enqueue(encoder.encode("> *Consulting clinical guidelines...*\n\n"));
        }

        try {
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
            fullSystemPrompt = `
${TOOL_PROMPT_MAP[intent]}
${gradeNote}
${signerNote}
${customInstructions}
`.trim();
          } else {
            // 2. Resolve RAG in the background for standard clinical Q&A
            [localContext, academicContext, webContext] = await Promise.all([
                getLocalContext(userContent),
                getAcademicContext(userContent),
                getWebContext(userContent)
            ]);

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

          // 3. Initiate the LLM stream
          const result = await streamText({
              model: together(LARGE_MODEL), 
              messages: [
                  { role: "system", content: fullSystemPrompt }, 
                  ...messages.map((m: ClientMessage) => ({ 
                      ...m, 
                      content: m.role === "user" ? sanitizeQuery(m.content) : m.content 
                  })),
              ],
              temperature: toolMode ? 0.3 : 0.2, 
              topP: 0.8,
          });

          let finalAnswer = "";

          // 4. Pipe the LLM tokens sequentially into our open stream
          for await (const chunk of result.textStream) {
              finalAnswer += chunk;
              controller.enqueue(encoder.encode(chunk));
          }

          // 5. Post-Stream operations
          finalAnswer = finalAnswer.replace(/\n?References:[\s\S]*$/i, "").trim();

          // Persist tool tag with history so reload can reconstruct toolCall
          const answerForHistory = toolMode
            ? `[[TOOL:${intent}]]\n\n${finalAnswer}`
            : finalAnswer;

          // Estimate tokens for DB
          const estimatedTokens = Math.ceil(finalAnswer.length / 4) + Math.ceil(fullSystemPrompt.length / 4);

          await logAnalytics(userId, "question_asked", { 
              cache: toolMode ? "tool_intent_stream" : "direct_stream",
              intent,
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
                  const tasks = [];
                  tasks.push(supabaseService.from(HISTORY_TABLE).insert({ 
                      user_id: userId, 
                      conversation_id: conversationId, 
                      question: latestUserMessage.content, 
                      answer: answerForHistory 
                  }));
                  tasks.push(updateMemory(userId, latestUserMessage.content, profile?.custom_instructions));
                  await Promise.allSettled(tasks);
              } catch (bgError) {
                  console.error("[Umbil] Critical background task error:", bgError);
              }
          }

        } catch (err: unknown) {
          console.error("Stream Error:", err);
          const msg = err instanceof Error ? err.message : "Internal server error";
          controller.enqueue(encoder.encode(`\n\n⚠️ **Error:** ${msg}`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Response-Type": "DIRECT_STREAM",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive"
        }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}