// src/app/api/tools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { tavily } from "@tavily/core";
import { 
  SYSTEM_PROMPTS, 
  REFERRAL_FEW_SHOT_EXAMPLES, 
  PATIENT_HANDOUT_FEW_SHOT 
} from "@/lib/prompts";
import { PATIENT_TEMPLATES } from "@/lib/patient-templates";

// --- CONFIG ---
const API_KEY = process.env.TOGETHER_API_KEY!;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;

// OPTIMIZATION: Llama 3.3 70B is the "Goldilocks" model for tools.
const MODEL_SLUG = "meta-llama/Llama-3.3-70B-Instruct-Turbo"; 

const together = createTogetherAI({ apiKey: API_KEY });
const tvly = TAVILY_API_KEY ? tavily({ apiKey: TAVILY_API_KEY }) : null;

// CIRCUIT BREAKER: Stop using Tavily if it errors out once (prevents hanging)
let isTavilyQuotaExceeded = false;

// --- TYPE DEFINITIONS ---
type ToolId = 'referral' | 'safety_netting' | 'discharge_summary' | 'sbar' | 'patient_friendly';
type ReferralMode = 'quick' | 'detailed';

interface ToolConfig {
  systemPrompt: string;
  useSearch: boolean;
  searchQueryGenerator?: (input: string) => string;
}

// --- PROMPTS & CONFIGURATION ---
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
  }
};

// --- HELPER: CONTEXT SEARCH ---
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

// --- MAIN ROUTE HANDLER ---
export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

  try {
    const { toolType, input, signerName, signerRole, referralMode } = await req.json();
    
    // Explicit cast to ToolId
    const config = TOOLS[toolType as ToolId];
    
    if (!input || !config) {
      return NextResponse.json({ error: `Invalid input or tool type: ${toolType}` }, { status: 400 });
    }

    // Context Injection
    let context = "";
    if (config.useSearch && config.searchQueryGenerator) {
      const searchQuery = config.searchQueryGenerator(input);
      context = await getContext(searchQuery);
    }

    // Dynamic Signature Injection (Only for Referrals)
    let signatureBlock = "";
    if (toolType === 'referral') {
       signatureBlock = (signerName || signerRole) 
        ? `\nIMPORTANT: Sign off the letter exactly as follows:\n"Kind regards,\n${signerName || ''}\n${signerRole || ''}"`
        : `\nSign off as: "Kind regards,\nDr [Name], GP" (or appropriate role based on context)`;
    }

    // --- FEW-SHOT & TEMPLATE INJECTION ---
    let fewShotExamples = "";
    let quickModeConstraint = "";
    let templateInjection = "";

    // 1. REFERRALS (V3 Logic)
    if (toolType === 'referral' && REFERRAL_FEW_SHOT_EXAMPLES) {
       const mode = (referralMode as ReferralMode) || 'detailed';
       
       const examplesStr = REFERRAL_FEW_SHOT_EXAMPLES.map(ex => `
INPUT: "${ex.input}"
OUTPUT:
${mode === 'quick' ? ex.quick : ex.detailed}
`).join("\n\n--------------------\n");

       fewShotExamples = `
\n\nThese are examples of high-quality GP-to-consultant referrals.
Match their tone, narrative flow, and level of certainty exactly.
Your output should feel interchangeable with these examples.

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

    // 2. PATIENT HANDOUTS (V4 Logic with Templates)
    if (toolType === 'patient_friendly') {
      // Check if input matches a known template key (simple fuzzy match)
      const lowerInput = input.toLowerCase();
      let matchedTemplateKey = "";
      
      for (const key of Object.keys(PATIENT_TEMPLATES)) {
         if (lowerInput.includes(key)) {
            matchedTemplateKey = key;
            break; // Stop at first match
         }
      }

      if (matchedTemplateKey) {
        // Inject Gold Standard Template
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
        // Fallback to few-shot if no template matches
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

    const finalPrompt = `
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

OUTPUT:
`;

    const result = await streamText({
      model: together(MODEL_SLUG),
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2, 
      maxOutputTokens: 1024, 
    });

    return result.toTextStreamResponse();

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Error";
    console.error("Tool API Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}