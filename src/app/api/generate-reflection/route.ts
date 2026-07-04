import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { checkAndTrackUsage, logAiUsage } from "@/lib/store";

// ---------- Config ----------
const API_KEY = process.env.TOGETHER_API_KEY!;

const LARGE_MODEL = "openai/gpt-oss-120b"; 
const SMALL_MODEL = "openai/gpt-oss-120b";

const together = createTogetherAI({
  apiKey: API_KEY,
});

export const runtime = 'edge';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "TOGETHER_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const userId = await getUserId(req);

    if (!userId) {
       return NextResponse.json({ error: "Authentication required to generate reflection." }, { status: 403 });
    }

    const { data: userProfile } = await supabaseService.from('profiles').select('is_pro').eq('id', userId).single();

    if (!userProfile?.is_pro) {
      const isAllowed = await checkAndTrackUsage(userId, 'learning_captures', 100, 'monthly', supabaseService);
      if (!isAllowed) {
         return NextResponse.json({ error: "Monthly usage limit reached. Please upgrade to Pro." }, { status: 403 });
      }
    } else {
      await checkAndTrackUsage(userId, 'learning_captures', 999999, 'monthly', supabaseService);
    }

    const body = await req.json();
    const { mode, userNotes, context } = body;

    let systemInstruction = "";
    let contextContent = "";
    let selectedModel = LARGE_MODEL;

    if (mode === 'psq_analysis') {
        const { stats, strengths, weaknesses, comments } = body;

        systemInstruction = `
        You are an expert Medical Appraiser for the NHS evaluating a colleague's portfolio.
        Draft a formal, introspective reflection based on the doctor's Patient Satisfaction Questionnaire (PSQ) results.
        
        REQUIRED STRUCTURE (Use these exact headers):
        
        WHAT PATIENTS VALUED MOST
        (Reflect on the high-scoring domains and positive themes using first-person clinical language: "I am pleased that my patients noted...")
        
        WHAT SURPRISED ME
        (Reflect on any unexpected feedback, trends, or particularly high/low scores in the first-person)
        
        WHAT I WILL CONTINUE DOING
        (State first-person clinical behaviors and communication strategies you will maintain to ensure patient safety and quality of care)
        
        WHAT I WILL IMPROVE
        (State first-person actionable steps to address the lowest scoring area or constructive feedback)
        
        PDP SUGGESTIONS
        (Propose 1-2 concrete, actionable Personal Development Plan goals based on this specific patient feedback)
        
        RULES:
        1. Tone: Professional, highly reflective, first-person ("I...").
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
    
    } else if (mode === 'executive_summary') {
      selectedModel = SMALL_MODEL; 
      
      const { stats, strengths, weaknesses, comments } = body;
      
      systemInstruction = `
      You are an expert Medical Appraiser.
      Write a data-driven "Appraisal-Ready Summary" (exactly 1 paragraph) of this doctor's recent patient feedback.
      
      Format it similar to this exact structure: "${stats?.totalResponses || 'Several'} patient responses were collected across various consultations. Overall patient satisfaction was high, with strong scores in ${strengths || 'clinical assessment'}. Free-text feedback highlighted [specific positive theme from comments] as particular strengths. One area identified for continued development was ${weaknesses || 'communication'}."
      
      Make it highly specific to the provided data.
      RULES:
      1. Tone: Professional, objective, data-driven. 
      2. Do NOT use bullet points. 
      3. STRICTLY PLAIN TEXT. No markdown or bolding. 
      4. Do not include the header text itself, just output the paragraph.
      `;
      
      contextContent = `
      DATA:
      - Total Responses: ${stats?.totalResponses}
      - Average Score: ${stats?.averageScore}/5.0
      - Top Domain: ${strengths}
      - Lowest Domain: ${weaknesses}
      - Patient Comments (Sample): ${JSON.stringify(comments)}
      `;
    
    } else if (mode === 'personalise') {
      selectedModel = SMALL_MODEL;
      systemInstruction = `
      You are an expert Medical Editor.
      Tidy up the grammar, spelling, and flow of the text below.
      Make it professional and concise.
      Do NOT add new facts.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `TARGET TEXT: "${userNotes}"`;

    } else if (mode === 'structured_reflection') {
      systemInstruction = `
      You are an expert Medical Educator.
      Rewrite the notes into a "What, So What, Now What" structure.
      HEADERS: LEARNING, APPLICATION, NEXT STEPS.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `NOTES: "${userNotes}" \n CONTEXT: "${JSON.stringify(context || {})}"`;

    } else if (mode === 'generate_tags') {
      selectedModel = SMALL_MODEL;
      systemInstruction = `
      You are a medical taxonomy expert.
      Extract 3-5 specific medical tags (comma separated).
      Example: "Cardiology, Heart Failure, NICE Guidelines"
      `;
      contextContent = `NOTES: "${userNotes}"`;

    } else {
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
      onFinish: async ({ text, usage }) => {
        const promptTokens = usage?.inputTokens ?? Math.ceil(finalPrompt.length / 4);
        const completionTokens = usage?.outputTokens ?? Math.ceil(text.length / 4);

        await logAiUsage(
            userId, 
            "/api/generate-reflection", 
            promptTokens, 
            completionTokens, 
            supabaseService
        );
      }
    });

    return result.toTextStreamResponse();

  } catch (err: unknown) {
    console.error("[Umbil] Reflection API Error:", err);
    const msg = (err as Error).message || "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}