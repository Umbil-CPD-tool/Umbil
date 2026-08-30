// src/app/api/ask/route.ts
import { NextRequest, NextResponse, after } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { streamText } from "ai";
import { tavily } from "@tavily/core";
import { resolveAskChatModel, resolveAskReasoningEffort } from "@/lib/askLlm";
import { SYSTEM_PROMPTS, STYLE_MODIFIERS } from "@/lib/prompts";
import { updateMemory } from "@/lib/memory"; 
import { getLocalContext, getAcademicContext } from "@/lib/rag";
import { buildTriageTemplateInjection } from "@/lib/digital-triage";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { resolveAskIntent, shouldAskModelForIntent, type AskIntent } from "@/lib/askIntent";
import { isHardClinicalQuestion, isPrescribingQuestion, isSimpleClinicalLookup, PRESCRIBING_GUARDRAILS } from "@/lib/prescribingGuardrails";
import { classifyAskIntent } from "@/lib/askIntentLlm";
import { CHAT_TOOL_IDS, type ChatToolId } from "@/lib/tools/types";
import { CORS_HEADERS, corsPreflight, withCors } from "@/lib/cors";
import {
  ENABLE_OFFICIAL_GUIDANCE,
  encodeOfficialGuidanceTag,
  fetchOfficialGuidanceHits,
  OFFICIAL_GUIDANCE_DOMAINS,
  pickOfficialGuidance,
  shouldAttachOfficialGuidance,
  type GuidanceSearchHit,
} from "@/lib/officialGuidance";

type ClientMessage = { role: "user" | "assistant"; content: string };
type AnswerStyle = "clinic" | "standard" | "deepDive";
type ToolIntent = ChatToolId;
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

/** Keep recent turns only — long histories inflate TTFT. */
const MAX_HISTORY_MESSAGES = 6;

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

const tvly = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;

let isTavilyQuotaExceeded = false;

const searchOfficialGuidance = tvly
  ? async (query: string): Promise<GuidanceSearchHit[]> => {
      if (isTavilyQuotaExceeded) return [];
      try {
        const searchResult = await tvly.search(`${query} UK NICE OR BNF OR CKS`, {
          searchDepth: "basic",
          includeImages: false,
          maxResults: 8,
          includeDomains: [...OFFICIAL_GUIDANCE_DOMAINS],
        });
        return (searchResult.results ?? []).map((result) => ({
          title: result.title || "",
          url: result.url,
          content: result.content || "",
        }));
      } catch (error) {
        console.error("[Umbil] Official guidance search failed (disabling search for this instance):", error);
        isTavilyQuotaExceeded = true;
        return [];
      }
    }
  : null;

function sanitizeQuery(q: string): string {
  return q.replace(/\b(john|jane|smith|mr\.|ms\.|mrs\.)\s+\w+/gi, "patient")
          .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "a specific date")
          .replace(/\b\d{6,10}\b/g, "an identifier")
          .replace(/\b(\d{1,3})\s+year\s+old\s+(male|female|woman|man|patient)\b/gi, "$1-year-old patient");
}

const getStyleModifier = (style?: AnswerStyle | null): string => {
  return STYLE_MODIFIERS[style || 'standard'] || STYLE_MODIFIERS.standard;
};

function isToolIntent(intent: AskIntent): intent is ToolIntent {
  return TOOL_INTENTS.includes(intent as ToolIntent);
}

/**
 * Fast keyword match first. If that is standard but the message still looks like a
 * command ("write this up", "something for the patient"), ask the model — that is
 * how Umbil infers a tool the regex has not seen yet. Dose lookups stay heuristic-only.
 */
async function resolveIntent(userMessage: string): Promise<AskIntent> {
  const heuristic = resolveAskIntent(userMessage);
  if (heuristic !== "standard") {
    console.log("[Umbil] Intent via heuristic:", heuristic);
    return heuristic;
  }

  if (!shouldAskModelForIntent(userMessage)) return "standard";

  const classified = await classifyAskIntent(userMessage);
  if (classified !== "standard") {
    console.log("[Umbil] Intent via model:", classified);
  }
  return classified;
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

  const deviceId = req.headers.get("x-device-id") || "unknown";

  try {
    const [userId, body] = await Promise.all([
      getUserId(req),
      req.json() as Promise<{
        messages?: ClientMessage[];
        answerStyle?: AnswerStyle | null;
        saveToHistory?: boolean;
        conversationId?: string;
      }>,
    ]);

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

    const { messages, answerStyle, saveToHistory, conversationId } = body;

    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400, headers: CORS_HEADERS });

    const latestUserMessage = messages[messages.length - 1];
    const userContent = latestUserMessage.content;

    const [trustedProfile, intent] = await Promise.all([
      userId ? loadTrustedProfile(userId) : Promise.resolve(EMPTY_PROFILE),
      resolveIntent(userContent),
    ]);
    const toolMode = isToolIntent(intent);
    const captureMode = intent === "capture_learning";
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
          if (captureMode) {
            const captureLine = "Opening Capture learning for this case.";
            controller.enqueue(encoder.encode(`[[ACTION:capture_learning]]\n\n${captureLine}`));
            controller.close();

            persistence = (async () => {
              try {
                await logAnalytics(userId, "question_asked", {
                  cache: "capture_learning",
                  intent,
                  device_id: deviceId,
                });

                if (!userId || latestUserMessage.role !== "user" || !saveToHistory) return;

                const { error } = await supabaseService.from(HISTORY_TABLE).insert({
                  user_id: userId,
                  conversation_id: conversationId,
                  question: latestUserMessage.content,
                  answer: `[[ACTION:capture_learning]]\n\n${captureLine}`,
                });
                if (error) console.error("[Umbil] Chat history insert error:", error);
              } catch (bgError) {
                console.error("[Umbil] Capture persist error:", bgError);
              }
            })();
            return;
          }

          if (toolMode) {
            controller.enqueue(encoder.encode(`[[TOOL:${intent}]]\n\n`));
          }

          const gradeNote = trustedProfile.grade ? ` User grade: ${trustedProfile.grade}.` : "";
          const customInstructions = !userId
              ? `\n\nUSER MEMORY: not signed in — nothing can be saved. Direct them to sign in, then Profile → Memory.\n`
              : trustedProfile.custom_instructions
              ? `\n\nUSER MEMORY (Profile → Memory):\n"${trustedProfile.custom_instructions}"\n`
              : `\n\nUSER MEMORY: empty. Facts they state about themselves will be saved after this reply.\n`;

          let fullSystemPrompt: string;
          let localContext = "";
          let academicContext = "";
          let webContext = "";
          let guidanceHitsPromise: Promise<GuidanceSearchHit[]> = Promise.resolve([]);
          let prescribing = false;
          let simpleLookup = false;
          let clinicMode = false;
          let hardQuestion = false;

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
            if (ENABLE_OFFICIAL_GUIDANCE && shouldAttachOfficialGuidance(userContent)) {
              guidanceHitsPromise = fetchOfficialGuidanceHits(
                sanitizeQuery(userContent),
                searchOfficialGuidance
              );
            }

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
            prescribing = isPrescribingQuestion(userContent);
            simpleLookup = isSimpleClinicalLookup(userContent);
            clinicMode = answerStyle === "clinic";
            hardQuestion = answerStyle === "deepDive" || isHardClinicalQuestion(userContent);
            const prescribingBlock = prescribing ? `\n${PRESCRIBING_GUARDRAILS}\n` : "";
            const contextBlock = combinedContext
              ? `\n--- COLLECTED CONTEXT ---\n${combinedContext}\n-------------------------\n`
              : "";

            fullSystemPrompt = `
${SYSTEM_PROMPTS.ASK_BASE}
${styleModifier}
${prescribingBlock}
${gradeNote}
${customInstructions}
${contextBlock}
`.trim();
          }

          // Q&A: OpenAI gpt-5.6-luna when ASK_PROVIDER=openai (default).
          // Tools: still Together gpt-oss-120b. Flip back with ASK_PROVIDER=together.
          const askChat = resolveAskChatModel(toolMode);
          const result = await streamText({
              model: askChat.model,
              messages: [
                  { role: "system", content: fullSystemPrompt },
                  ...recentMessages.map((m: ClientMessage) => ({
                      ...m,
                      content: m.role === "user" ? sanitizeQuery(m.content) : m.content
                  })),
              ],
              ...(askChat.provider === "together"
                ? { temperature: toolMode ? 0.3 : 0.2, topP: 0.8 }
                : {
                    providerOptions: {
                      openai: {
                        reasoningEffort: resolveAskReasoningEffort({
                          simpleLookup,
                          clinicMode,
                          hard: hardQuestion,
                        }),
                      },
                    },
                  }),
          });

          let finalAnswer = "";

          // Pipe the LLM tokens sequentially into our open stream
          for await (const chunk of result.textStream) {
              finalAnswer += chunk;
              controller.enqueue(encoder.encode(chunk));
          }

          finalAnswer = finalAnswer.replace(/\n?References:[\s\S]*$/i, "").trim();

          let guidanceCount = 0;
          if (ENABLE_OFFICIAL_GUIDANCE && !toolMode) {
            const guidanceLinks = pickOfficialGuidance(
              await guidanceHitsPromise,
              userContent,
              finalAnswer
            );
            const guidanceTag = encodeOfficialGuidanceTag(guidanceLinks);
            if (guidanceTag) {
              guidanceCount = guidanceLinks.length;
              finalAnswer += guidanceTag;
              controller.enqueue(encoder.encode(guidanceTag));
            }
          }

          // Close the HTTP stream before slow post-stream DB work so the client
          // does not sit on an idle connection (browsers report that as Failed to fetch).
          controller.close();

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
                  provider: askChat.provider,
                  model: askChat.modelId,
                  rag_enabled: ENABLE_CHAT_RAG,
                  prescribing,
                  simple_lookup: simpleLookup,
                  clinic_mode: clinicMode,
                  hard_question: hardQuestion,
                  guidance_count: guidanceCount,
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