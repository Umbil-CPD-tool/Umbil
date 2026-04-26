// src/app/api/tools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { 
  SYSTEM_PROMPTS, 
  REFERRAL_FEW_SHOT_EXAMPLES, 
  PATIENT_HANDOUT_FEW_SHOT,
  DISCHARGE_FEW_SHOT_EXAMPLES 
} from "@/lib/prompts";
import { PATIENT_TEMPLATES } from "@/lib/patient-templates";
import { SAFETY_NETTING_TEMPLATES } from "@/lib/safety-netting-templates";
import { checkAndTrackUsage } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { supabaseService } from "@/lib/supabaseService"; 

// --- CONFIG ---
const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

// DYNAMIC MODEL ROUTING
const DEFAULT_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo"; 
const PREMIUM_MODEL = "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo";

const together = createTogetherAI({ apiKey: API_KEY });
const tvly = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;

let isTavilyQuotaExceeded = false;

type ToolId = 'referral' | 'safety_netting' | 'discharge_summary' | 'sbar' | 'patient_friendly' | 'translate_handout';
type ReferralMode = 'quick' | 'detailed';

interface ToolConfig {
  systemPrompt: string;
  useSearch: boolean;
  searchQueryGenerator?: (input: string) => string;
}

const TOOLS: Record<ToolId, ToolConfig> = {
  referral: {
    useSearch: false,
    searchQueryGenerator: (input) => `NICE CKS referral guidelines UK ${input}`,
    systemPrompt: SYSTEM_PROMPTS.TOOLS.REFERRAL 
  },
  safety_netting: {
    useSearch: false,
    searchQueryGenerator: (input) => `NICE CKS safety netting red flags ${input}`,
    systemPrompt: SYSTEM_PROMPTS.TOOLS.SAFETY_NETTING
  },
  sbar: {
    useSearch: false,
    systemPrompt: SYSTEM_PROMPTS.TOOLS.SBAR
  },
  discharge_summary: {
    useSearch: false,
    systemPrompt: SYSTEM_PROMPTS.TOOLS.DISCHARGE
  },
  patient_friendly: {
    useSearch: false,
    systemPrompt: SYSTEM_PROMPTS.TOOLS.PATIENT_FRIENDLY 
  },
  translate_handout: {
    useSearch: false,
    systemPrompt: SYSTEM_PROMPTS.TOOLS.TRANSLATE_HANDOUT
  }
};

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch { return null; }
}

async function getContext(query: string): Promise<string> {
  if (!tvly || isTavilyQuotaExceeded) return "";
  
  try {
    const result = await tvly.search(query, {
      searchDepth: "basic", 
      maxResults: 2,
      includeDomains: ["nice.org.uk", "cks.nice.org.uk", "patient.info"]
    });
    
    if (!result || !result.results) return "";

    const snippets = result.results.map(r => `Source: ${r.url}\nExcerpt: ${r.content}`).join("\n\n");
    return `\n\n--- CLINICAL GUIDELINES CONTEXT ---\n${snippets}\n-----------------------------------\n`;
  } catch (error) {
    console.error("Tool search failed (disabling search for this instance):", error);
    isTavilyQuotaExceeded = true;
    return "";
  }
}

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

  try {
    // 1. EXTRACT USER & ENFORCE TOOL LIMITS
    const userId = await getUserId(req);
    
    if (!userId) {
       return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });
    }

    const { data: userProfile } = await supabaseService.from('profiles').select('is_pro').eq('id', userId).single();
    
    if (!userProfile?.is_pro) {
      const isAllowed = await checkAndTrackUsage(userId, 'tools', 5, 'monthly');
      if (!isAllowed) {
         return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });
      }
    } else {
      await checkAndTrackUsage(userId, 'tools', 999999, 'monthly');
    }

    // 2. PROCEED WITH TOOL GENERATION
    const { toolType, input, signerName, signerRole, referralMode, targetLanguage } = await req.json();
    
    const config = TOOLS[toolType as ToolId];
    
    if (!input || !config) {
      return NextResponse.json({ error: `Invalid input or tool type: ${toolType}` }, { status: 400 });
    }

    // Determine Model: Only referral gets the expensive 405B model
    const activeModelSlug = toolType === 'referral' ? PREMIUM_MODEL : DEFAULT_MODEL;

    let context = "";
    if (config.useSearch && config.searchQueryGenerator) {
      const searchQuery = config.searchQueryGenerator(input);
      context = await getContext(searchQuery);
    }

    let signatureBlock = "";
    if (toolType === 'referral') {
       signatureBlock = (signerName || signerRole) 
        ? `\nIMPORTANT: Sign off the letter exactly as follows:\n"Kind regards,\n${signerName || ''}\n${signerRole || ''}"`
        : `\nSign off as: "Kind regards,\nDr [Name], GP" (or appropriate role based on context)`;
    }

    let fewShotExamples = "";
    let quickModeConstraint = "";
    let templateInjection = "";

    if (toolType === 'referral' && REFERRAL_FEW_SHOT_EXAMPLES) {
       const mode = (referralMode as ReferralMode) || 'detailed';
       
       const examplesStr = REFERRAL_FEW_SHOT_EXAMPLES.map(ex => `
INPUT: "${ex.input}"
OUTPUT:
${mode === 'quick' ? ex.quick : ex.detailed}
`).join("\n\n--------------------\n");

       fewShotExamples = `
\n\nThese are examples of high-quality GP-to-consultant referrals.
Match their professional formatting, narrative flow, and structural layout exactly.

${examplesStr}
\n--------------------\n
`;

       if (mode === 'quick') {
         quickModeConstraint = `
\nSTRICT CONSTRAINT: You are in QUICK MODE. 
- Limit output to maximum 3-4 sentences. 
- Output must ALWAYS start with "Dear Colleague,".
- Do NOT explain clinical reasoning or guidelines. State the facts and the ask only.
- Focus ONLY on the primary reason for referral and red flags. 
- Be professional but ruthlessly concise.\n
`;
       }
    }

    if (toolType === 'discharge_summary' && DISCHARGE_FEW_SHOT_EXAMPLES) {
        const examplesStr = DISCHARGE_FEW_SHOT_EXAMPLES.map(ex => `
INPUT: "${ex.input}"
OUTPUT:
${ex.output}
`).join("\n\n--------------------\n");

        fewShotExamples = `
\n\nThese are examples of high-quality UK hospital discharge letters.
Match their professional formatting, narrative flow, and structural layout exactly.

${examplesStr}
\n--------------------\n
`;
    }

    if (toolType === 'patient_friendly') {
      const lowerInput = input.toLowerCase();
      let matchedTemplateKey = "";
      
      for (const key of Object.keys(PATIENT_TEMPLATES)) {
         if (lowerInput.includes(key)) {
            matchedTemplateKey = key;
            break;
         }
      }

      if (matchedTemplateKey) {
        const template = PATIENT_TEMPLATES[matchedTemplateKey];
        templateInjection = `
\n\n!!! GOLD STANDARD TEMPLATE DETECTED FOR: ${matchedTemplateKey.toUpperCase()} !!!
Use the text below as your starting point. 
Do NOT rewrite it completely. 
Only modify it if the user input contains specific details that contradict it or add personal context.

TEMPLATE:
${template}
\n\n!!! END TEMPLATE !!!\n
`;
      } else if (PATIENT_HANDOUT_FEW_SHOT) {
        const examplesStr = PATIENT_HANDOUT_FEW_SHOT.map(ex => `
INPUT: "${ex.input}"
OUTPUT:
${ex.output}
`).join("\n\n--------------------\n");

        fewShotExamples = `
\n\nThese are examples of high-quality NHS patient handouts.
Follow this structure, tone, and formatting EXACTLY.

${examplesStr}
\n--------------------\n
`;
      }
    }

    if (toolType === 'safety_netting') {
      const lowerInput = input.toLowerCase();
      let matchedTemplateKey = "";
      
      for (const key of Object.keys(SAFETY_NETTING_TEMPLATES)) {
         const matchableKey = key.replace(/_/g, ' ').toLowerCase();
         if (lowerInput.includes(matchableKey)) {
            matchedTemplateKey = key;
            break;
         }
      }

      if (!matchedTemplateKey && lowerInput.includes('fever')) {
         if (lowerInput.includes('child') || lowerInput.includes('paediatric') || lowerInput.includes('baby')) {
            matchedTemplateKey = 'FEVER_CHILD';
         } else {
            matchedTemplateKey = 'FEVER_ADULT';
         }
      }

      if (matchedTemplateKey) {
        const template = SAFETY_NETTING_TEMPLATES[matchedTemplateKey];
        templateInjection = `
\n\n!!! MANDATORY TEMPLATE FOR: ${matchedTemplateKey} !!!
Use the text below as your clinical anchor. 
STRICT INSTRUCTION: You must include all the core red flags from this template, but you SHOULD adapt the phrasing slightly to match the patient's specific presentation. 

TEMPLATE:
${template}
\n\n!!! END TEMPLATE !!!\n
`;
      }
    }

    let finalPrompt = `
${config.systemPrompt}

${context ? `Use the following guidelines to ensure safety/accuracy:\n${context}` : ""}

${templateInjection}
${fewShotExamples}

${signatureBlock}

USER INPUT NOTES:
${input}

STRICT INSTRUCTION: 
Refine the above input into the requested format. 
Do not add any new medical facts not supported by the input or the templates provided.

${quickModeConstraint}
`;

    if (toolType === 'translate_handout') {
        finalPrompt += `\nTARGET LANGUAGE: ${targetLanguage}\n`;
    }

    finalPrompt += `\nOUTPUT:\n`;

    const result = await streamText({
      model: together(activeModelSlug),
      messages: [{ role: "user", content: finalPrompt }],
      temperature: toolType === 'referral' ? 0.35 : 0.15, // Slightly higher temp for better narrative flow on referrals
      topP: 0.9,
      maxOutputTokens: 1024, 
    });

    return result.toTextStreamResponse();

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Error";
    console.error("Tool API Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}