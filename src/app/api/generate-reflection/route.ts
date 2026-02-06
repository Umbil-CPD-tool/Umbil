// src/app/api/generate-reflection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";

// ---------- Config ----------
const API_KEY = process.env.TOGETHER_API_KEY!;

// Model Strategy:
// LARGE: Llama 3.3 70B (State of the Art). Keeps the main reports high quality and FAST.
const LARGE_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo"; 

// SMALL: Gemma 2 9B (Best Value).
// Costs ~$0.20/1M tokens. Very smart for its size, perfect for grammar/chats.
const SMALL_MODEL = "google/gemma-2-9b-it";

const together = createTogetherAI({
  apiKey: API_KEY,
});

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "TOGETHER_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { mode, userNotes, context } = body;

    let systemInstruction = "";
    let contextContent = "";
    
    // Default to LARGE model for complex tasks
    let selectedModel = LARGE_MODEL; 

    if (mode === 'psq_analysis') {
        // --- MODE: PSQ ANALYSIS ---
        // Complex reasoning required -> Use LARGE_MODEL
        const { stats, strengths, weaknesses, comments } = body;
        
        systemInstruction = `
        You are an expert Medical Appraiser for the NHS.
        Draft a formal reflection based on the doctor's Patient Satisfaction Questionnaire (PSQ) results.
        
        REQUIRED STRUCTURE (Use these exact headers):
        
        WHAT PATIENTS FELT WENT WELL
        (Summarize the high scoring domains and positive themes. Be specific.)
        
        AREAS TO IMPROVE
        (Address the lowest scoring area or constructive feedback diplomatically.)
        
        LEARNING IDENTIFIED
        (What does this data show about their practice? Link to GMC domains if possible.)
        
        ACTIONS TO TAKE
        (Propose 1-2 concrete, actionable steps to improve patient experience.)
        
        RULES:
        1. Tone: Professional, first-person ("I...").
        2. STRICTLY PLAIN TEXT. No markdown headers (##) or bold (**). 
        3. Do NOT include greeting or sign-off.
        `;

        contextContent = `
        DATA:
        - Total Responses: ${stats.totalResponses}
        - Average Score: ${stats.averageScore}/5.0
        - Top Domain: ${strengths}
        - Lowest Domain: ${weaknesses}
        - Patient Comments: ${JSON.stringify(comments)}
        
        USER NOTES: "${userNotes || ''}"
        `;

    } else if (mode === 'personalise') {
      // Simple edit task -> Use SMALL_MODEL (Gemma 9B) to save money
      selectedModel = SMALL_MODEL;
      
      systemInstruction = `
      You are an expert Medical Editor. 
      Tidy up the grammar, spelling, and flow of the text below.
      Make it professional and concise. Do NOT add new facts.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `TARGET TEXT: "${userNotes}"`;

    } else if (mode === 'structured_reflection') {
      // Medium complexity -> Use LARGE_MODEL for quality
      systemInstruction = `
      You are an expert Medical Educator.
      Rewrite the notes into a "What, So What, Now What" structure.
      HEADERS: LEARNING, APPLICATION, NEXT STEPS.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `NOTES: "${userNotes}" \n CONTEXT: "${JSON.stringify(context || {})}"`;

    } else if (mode === 'generate_tags') {
      // Simple extraction -> Use SMALL_MODEL
      selectedModel = SMALL_MODEL;
      
      systemInstruction = `
      You are a medical taxonomy expert.
      Extract 3-5 specific medical tags (comma separated).
      Example: "Cardiology, Heart Failure, NICE Guidelines"
      `;
      contextContent = `NOTES: "${userNotes}"`;

    } else {
      // General Chat -> Use SMALL_MODEL for speed/cost
      selectedModel = SMALL_MODEL;

      systemInstruction = `
      You are Umbil, a UK clinical reflection assistant.
      Write a generic educational reflection based on the Q&A below.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `Question: ${body.question}\nAnswer: ${body.answer}\nNotes: ${userNotes || ''}`;
    }

    const finalPrompt = `
    ${systemInstruction}
    ---
    ${contextContent}
    ---
    RESPOND ONLY WITH THE REQUESTED TEXT.
    `;

    const result = await streamText({
      model: together(selectedModel),
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    return result.toTextStreamResponse();

  } catch (err: unknown) {
    console.error("[Umbil] Reflection API Error:", err);
    const msg = (err as Error).message || "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}