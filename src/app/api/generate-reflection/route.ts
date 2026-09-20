import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService";
import { checkAndTrackUsage } from "@/lib/store";
import { CORS_HEADERS, corsPreflight, withCors } from "@/lib/cors";
import { appraisalPackSystemInstructions } from "@/lib/appraisalAi";

// ---------- Config ----------
const API_KEY = process.env.TOGETHER_API_KEY!;

const LARGE_MODEL = "openai/gpt-oss-120b";
// Stay on 120B — Together's smaller serverless models (Qwen 7B, gpt-oss-20b)
// keep disappearing. Speed comes from low reasoning + a short prompt, not a
// second model that can 404.
const FAST_MODEL = "openai/gpt-oss-120b";

const together = createTogetherAI({
  apiKey: API_KEY,
});

const clip = (value: unknown, max = 240): string => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
};

export const runtime = 'edge';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch { return null; }
}

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "TOGETHER_API_KEY not set" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const userId = await getUserId(req);

    if (!userId) {
       return NextResponse.json({ error: "Authentication required to generate reflection." }, { status: 403, headers: CORS_HEADERS });
    }

    const { data: userProfile } = await supabaseService.from('profiles').select('is_pro').eq('id', userId).single();

    const body = await req.json();
    const { mode, userNotes, context } = body;
    const isAppraisalMode =
      mode === 'psq_analysis' ||
      mode === 'executive_summary' ||
      mode === 'psq_appraisal_pack';

    if (isAppraisalMode) {
      if (!userProfile?.is_pro) {
        return NextResponse.json(
          { error: "LIMIT_REACHED" },
          { status: 403, headers: CORS_HEADERS }
        );
      }
    } else if (!userProfile?.is_pro) {
      const isAllowed = await checkAndTrackUsage(userId, 'learning_captures', 100, 'monthly', supabaseService);
      if (!isAllowed) {
         return NextResponse.json({ error: "Monthly usage limit reached. Please upgrade to Pro." }, { status: 403, headers: CORS_HEADERS });
      }
    }

    let systemInstruction = "";
    let contextContent = "";
    let selectedModel = LARGE_MODEL;
    let maxOutputTokens = 1024;
    let reasoningEffort: "low" | "medium" = "medium";

    if (mode === 'psq_appraisal_pack') {
        const { stats, strengths, weaknesses, comments, domainScores, appointmentTypes } = body;
        selectedModel = LARGE_MODEL;
        reasoningEffort = "medium";
        maxOutputTokens = 1400;

        systemInstruction = appraisalPackSystemInstructions({
          audience: "patients",
          includeGmcMapping: false,
          responseCountHint: stats?.totalResponses ?? "Several",
        });

        const goodComments = Array.isArray(comments)
          ? comments.filter((c: unknown) => typeof c === "string" && c.trim()).slice(0, 24)
          : [];
        const improveComments = Array.isArray(body.improveComments)
          ? body.improveComments.filter((c: unknown) => typeof c === "string" && c.trim()).slice(0, 24)
          : [];

        contextContent = `
        DATA:
        - Total Responses: ${stats?.totalResponses}
        - Average Score: ${stats?.averageScore}/5.0
        - Top Domain: ${strengths}
        - Lowest Domain: ${weaknesses}
        - Domain scores: ${JSON.stringify(domainScores || [])}
        - Appointment types: ${JSON.stringify(appointmentTypes || [])}
        - Positive free-text (sample): ${JSON.stringify(goodComments)}
        - Improvement free-text (sample): ${JSON.stringify(improveComments)}
        - USER NOTES: "${userNotes || ''}"
        `;

    } else if (mode === 'psq_analysis') {
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
      selectedModel = FAST_MODEL;
      reasoningEffort = "low";
      maxOutputTokens = 220; 
      
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
      selectedModel = FAST_MODEL;
      reasoningEffort = "low";
      maxOutputTokens = 400;
      systemInstruction = `
      You are an expert Medical Editor.
      Tidy up the grammar, spelling, and flow of the text below.
      Make it professional and concise.
      Do NOT add new facts.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `TARGET TEXT: "${userNotes}"`;

    } else if (mode === 'guided_reflection' || mode === 'structured_reflection') {
      const prompts = body.prompts ?? {};
      const learned = String(prompts.learned ?? "").trim();
      const differently = String(prompts.differently ?? "").trim();
      const learningNeeds = String(prompts.learningNeeds ?? "").trim();
      const isGuided = mode === 'guided_reflection';
      const topic = clip(context?.question, 160);
      selectedModel = FAST_MODEL;
      reasoningEffort = "low";
      maxOutputTokens = 360;

      systemInstruction = isGuided
        ? `
Structure the doctor's own answers into a short CPD reflection.
Do not invent facts, guidelines, doses, or actions they did not write.
Plain text only. First person. No markdown. No title or sign-off.
Omit any section they left blank. Keep it tight (about 80-140 words).

LEARNING
APPLICATION
NEXT STEPS
      `.trim()
        : `
Rewrite the notes into LEARNING / APPLICATION / NEXT STEPS.
STRICTLY PLAIN TEXT. No markdown.
      `.trim();

      contextContent = isGuided
        ? `
Topic: ${topic || "not specified"}
Learned: ${learned || "(blank)"}
Do differently: ${differently || "(blank)"}
Still to learn: ${learningNeeds || "(blank)"}
      `.trim()
        : `NOTES: "${clip(userNotes, 800)}"\nTOPIC: "${topic}"`;

    } else if (mode === 'generate_tags') {
      selectedModel = FAST_MODEL;
      reasoningEffort = "low";
      maxOutputTokens = 80;
      systemInstruction = `
      You are a medical taxonomy expert.
      Extract 3-5 specific medical tags (comma separated).
      Example: "Cardiology, Heart Failure, NICE Guidelines"
      `;
      contextContent = `NOTES: "${userNotes}"`;

    } else {
      selectedModel = FAST_MODEL;
      reasoningEffort = "low";
      maxOutputTokens = 360;
      systemInstruction = `
      You are Umbil, a UK clinical reflection assistant.
      Write a generic educational reflection based on the Q&A below.
      STRICTLY PLAIN TEXT. No markdown.
      `;
      contextContent = `Question: ${clip(body.question, 200)}\nAnswer: ${clip(body.answer, 400)}\nNotes: ${clip(userNotes, 400)}`;
    }

    const finalPrompt = `${systemInstruction}\n---\n${contextContent}\n---\nRESPOND ONLY WITH THE REQUESTED TEXT.`;

    const result = await streamText({
      model: together(selectedModel),
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
      maxOutputTokens,
      providerOptions: {
        togetherai: {
          reasoningEffort,
        },
      },
    });

    return result.toTextStreamResponse({ headers: withCors() });

  } catch (err: unknown) {
    console.error("[Umbil] Reflection API Error:", err);
    const msg = (err as Error).message || "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  }
}
