// src/app/test-memory/route.ts
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

const together = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY! });

// Using the same 8B model used in the real memory.ts
const MEMORY_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

export async function GET() {
  const testCases = [
    { 
        id: "TC1-PureQuestion",
        input: "What is the dose of Aspirin?", 
        current: "",
        expected: "__NO_UPDATE__"
    },
    { 
        id: "TC2-PureFact",
        input: "I am a GP in Scotland.", 
        current: "",
        expected: "User is a GP, works in Scotland"
    },
    { 
        id: "TC3-MixedIntent-YourFailureCase",
        input: "What are red flags for back pain? I am a GP.", 
        current: "",
        expected: "User is a GP"
    },
    { 
        id: "TC4-UpdateExisting",
        input: "Actually, I am a nurse now.", 
        current: "User is a GP",
        expected: "User is a nurse"
    },
  ];

  const results = await Promise.all(testCases.map(async (tc) => {
    const { text } = await generateText({
      model: together(MEMORY_MODEL),
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.MEMORY_CONSOLIDATOR },
        { role: "user", content: `CURRENT MEMORY:\n${tc.current}\n\nNEW USER MESSAGE:\n"${tc.input}"` }
      ],
      temperature: 0.1, 
    });
    return { 
        id: tc.id,
        input: tc.input, 
        result: text,
        pass: text === "__NO_UPDATE__" ? (tc.expected === "__NO_UPDATE__") : (text.includes("GP") || text.includes("nurse")) 
    };
  }));

  return NextResponse.json({ 
      summary: "Visit this endpoint to verify memory logic.",
      results 
  }, { status: 200 });
}