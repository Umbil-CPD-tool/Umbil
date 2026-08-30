// src/app/api/ask/route.ts
import { NextRequest, NextResponse, after } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { streamText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { SYSTEM_PROMPTS, STYLE_MODIFIERS } from "@/lib/prompts";
import { updateMemory } from "@/lib/memory"; 
import { getLocalContext, getAcademicContext } from "@/lib/rag";
import { buildTriageTemplateInjection } from "@/lib/digital-triage";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { resolveAskIntent } from "@/lib/askIntent";
import { CHAT_TOOL_IDS, type ChatToolId } from "@/lib/tools/types";
import { CORS_HEADERS, corsPreflight, withCors } from "@/lib/cors";

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";
type ToolIntent = ChatToolId;
type AskIntent = ToolIntent | "standard";
type TrustedProfile = {
  full_name: string | null;
  grade: string | null;
  custom_instructions: string | null;
};

const GENERIC_ERROR = "Something went wrong. Please try again.";
const EMPTY_PROFILE: TrustedProfile = {
  full_name: null,
  grade: null,
  custom_instructions: null,
};

const loadTrustedProfile = async (userId: string): Promise<TrustedProfile> => {
  const { data } = await supabaseService
    .from("profiles")
    .select("full_name, grade, custom_instructions")
    .eq("id", userId)
    .single();

  if (!data) return EMPTY_PROFILE;

  return {
    full_name: data.full_name ?? null,
    grade: data.grade ?? null,
    custom_instructions: data.custom_instructions ?? null,
  };
};

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

/**
 * Sync intent only — no LLM classifier, so nothing is added before the first answer token.
 * Rules and the phrasing corpus behind them live in src/lib/askIntent.ts.
 */
function resolveIntent(userMessage: string): AskIntent {
  const intent = resolveAskIntent(userMessage);
  if (intent !== "standard") {
    console.log("[Umbil] Intent via heuristic:", intent);
  }
  return intent;
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
  try {
    await supabaseService.from(ANALYTICS_TABLE).insert({ user_id: userId, event_type: eventType, metadata });
  } catch (err) {
    console.error("[Umbil] Analytics insert failed:", err);
  }
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

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "TOGETHER_API_KEY not set" }, { status: 500, headers: CORS_HEADERS });

  const userId = await getUserId(req);
  const deviceId = req.headers.get("x-device-id") || "unknown";

  if (!userId) {
    if (!checkRateLimit(`guest:${clientIp(req)}`)) {
      return NextResponse.json(
        { error: "You've reached the free limit of 10 queries per hour. Please create a free account to continue using Umbil." },
        { status: 429, headers: CORS_HEADERS }
      );
    }
  } else if (!checkRateLimit(`user:${userId}`, 300)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  try {
    const { messages, answerStyle, saveToHistory, conversationId } = await req.json();

    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400, headers: CORS_HEADERS });

    // Authenticated users: profile comes from DB only. Guests: never trust client profile.
    const trustedProfile: TrustedProfile = userId
      ? await loadTrustedProfile(userId)
      : EMPTY_PROFILE;

    const latestUserMessage = messages[messages.length - 1];
    const userContent = latestUserMessage.content;

    // Sync intent (heuristic only) — no LLM round-trip before answer tokens
    const intent = resolveIntent(userContent);
    const toolMode = isToolIntent(intent);
    const recentMessages: ClientMessage[] = messages.slice(-MAX_HISTORY_MESSAGES);

    // Persistence has to outlive the response stream. Vercel can freeze the invocation the
    // moment the stream closes, which silently dropped chat history and memory writes, so the
    // work is handed to after() instead of being awaited behind a closed controller.
    let releasePostWork: (work: Promise<unknown>) => void = () => {};
    const postWork = new Promise<unknown>((resolve) => {
      releasePostWork = resolve;
    });
    after(postWork);

    // --- INSTANT STREAM CONTROLLER ---
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let persistence: Promise<unknown> = Promise.resolve();

        try {
          if (toolMode) {
            controller.enqueue(encoder.encode(`[[TOOL:${intent}]]\n\n`));
          }

          const gradeNote = trustedProfile.grade ? ` User grade: ${trustedProfile.grade}.` : "";
          const customInstructions = trustedProfile.custom_instructions
              ? `\n\nUSER PREFERENCES (STRICTLY FOLLOW):\n"${trustedProfile.custom_instructions}"\n`
              : "";

          let fullSystemPrompt: string;
          let localContext = "";
          let academicContext = "";
          let webContext = "";

          if (toolMode) {
            // Tool intents: use dedicated document prompts (no ASK_BASE / RAG)
            const signerNote = trustedProfile.full_name
              ? `\nSign documents as: ${trustedProfile.full_name}${trustedProfile.grade ? `, ${trustedProfile.grade}` : ""}.\n`
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

          const shouldPersistTurn = Boolean(userId) && latestUserMessage.role === "user" && Boolean(saveToHistory);

          persistence = (async () => {
            try {
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

              if (!shouldPersistTurn || !userId) return;

              const [historyResult, memoryResult] = await Promise.allSettled([
                  supabaseService.from(HISTORY_TABLE).insert({ 
                      user_id: userId, 
                      conversation_id: conversationId, 
                      question: latestUserMessage.content, 
                      answer: answerForHistory 
                  }),
                  updateMemory(userId, latestUserMessage.content),
              ]);

              if (historyResult.status === "rejected") {
                  console.error("[Umbil] Chat history insert failed:", historyResult.reason);
              } else if (historyResult.value.error) {
                  console.error("[Umbil] Chat history insert error:", historyResult.value.error);
              }

              // Surface memory outcomes in analytics so silent skips are diagnosable.
              const memoryOutcome = memoryResult.status === "fulfilled"
                  ? memoryResult.value
                  : { status: "failed" as const, reason: "unexpected_error" as const };

              if (memoryResult.status === "rejected") {
                  console.error("[Umbil] Memory update rejected:", memoryResult.reason);
              }

              await logAnalytics(userId, "memory_update", {
                  status: memoryOutcome.status,
                  reason: memoryOutcome.status === "saved" ? null : memoryOutcome.reason,
                  had_memory: Boolean(trustedProfile.custom_instructions),
                  device_id: deviceId,
              });
            } catch (bgError) {
              console.error("[Umbil] Critical background task error:", bgError);
            }
          })();

        } catch (err: unknown) {
          console.error("Stream Error:", err);
          try {
            controller.enqueue(encoder.encode(`\n\n${GENERIC_ERROR}`));
          } catch {
            // Controller may already be closed if the client disconnected
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed after a successful stream
          }
          releasePostWork(persistence);
        }
      }
    });

    return new Response(stream, {
        headers: withCors({
            "Content-Type": "text/plain; charset=utf-8",
            "X-Response-Type": "DIRECT_STREAM",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        })
    });

  } catch (err: unknown) {
    console.error("[Umbil] Ask route error:", err);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500, headers: CORS_HEADERS });
  }
}