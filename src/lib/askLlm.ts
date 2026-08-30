// src/lib/askLlm.ts
// Chat-model picker for /api/ask.
//
// Revert after the trial: set ASK_PROVIDER=together in Vercel (or delete it).
// Together stays the default for document tools so referral/SBAR prompts do not move.

import { createOpenAI } from "@ai-sdk/openai";
import { createTogetherAI } from "@ai-sdk/togetherai";

export const TOGETHER_ASK_MODEL = "openai/gpt-oss-120b";
export const OPENAI_ASK_MODEL = process.env.ASK_OPENAI_MODEL || "gpt-5.6-luna";

/** "openai" = GPT-5.6 Luna for ordinary Q&A. "together" = previous gpt-oss-120b path. */
export const ASK_PROVIDER = (process.env.ASK_PROVIDER || "openai").toLowerCase();

export const ASK_REASONING_EFFORT =
  process.env.ASK_REASONING_EFFORT || "low";

export const together = createTogetherAI({
  apiKey: process.env.TOGETHER_API_KEY,
});

const openai = process.env.OPENAI_API_KEY
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type AskChatChoice = {
  model: ReturnType<typeof together> | ReturnType<NonNullable<typeof openai>>;
  provider: "openai" | "together";
  modelId: string;
};

/**
 * Document tools stay on Together. Ordinary ASK_BASE questions use OpenAI Luna
 * when ASK_PROVIDER is openai and OPENAI_API_KEY is set.
 */
export const resolveAskChatModel = (toolMode: boolean): AskChatChoice => {
  const wantOpenAI = !toolMode && ASK_PROVIDER !== "together";

  if (wantOpenAI && openai) {
    return {
      model: openai(OPENAI_ASK_MODEL),
      provider: "openai",
      modelId: OPENAI_ASK_MODEL,
    };
  }

  if (wantOpenAI && !openai) {
    console.warn(
      "[Umbil] ASK_PROVIDER=openai but OPENAI_API_KEY is missing — falling back to Together gpt-oss-120b."
    );
  }

  return {
    model: together(TOGETHER_ASK_MODEL),
    provider: "together",
    modelId: TOGETHER_ASK_MODEL,
  };
};
