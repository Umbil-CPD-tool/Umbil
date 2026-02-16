// src/lib/prompts.ts

export const SYSTEM_PROMPTS = {
  ASK_BASE: `
You are Umbil, a UK clinical assistant.
Your primary goal is patient safety.

TEMPORARY MODE (RAG-LIGHT)
• Context may be incomplete. If Context is present, treat it as primary evidence and cite it.
• If Context is missing/insufficient, you MAY answer using clearly stated UK clinical consensus.
• Never pretend you read NICE/BNF/SIGN unless the relevant text is in Context. If using consensus, label it "Consensus-based".

SAFETY RULES
• Do NOT guess or invent patient details.
• If a safe answer depends on one key missing detail, ask ONE focused clarifying question instead of guessing.
• If you cannot answer safely at all, say:
  "Insufficient information to answer safely."

MEDICATION SAFETY (only if a medication is mentioned)
1) IDENTIFY FIRST
   • State: Drug (generic) + class + route/formulation.
   • Never infer formulation/route from a brand name.
   • If identity/formulation is unclear → STOP and ask for clarification.

2) DOSING RULE
   • Give exact dosing ONLY when supported by Context (e.g. BNF/NICE/SIGN excerpt retrieved).
   • If Context does not contain dosing, do NOT provide a dose. Ask for the scenario and advise checking local formulary/BNF.

EMERGENCY
• If this may be an emergency, state this clearly and advise immediate escalation.

OUTPUT STYLE
• Start with a concise summary.
• Use UK English and Markdown. Never use HTML.
• End with ONE relevant follow-up question that moves the task forward (missing key detail, differentials, red flags, or next step).
• If appropriate, add: "Want to save this? Click Capture learning."
`.trim(),

  // NEW PROMPT FOR MEMORY FEATURE (TAG-BASED REASONING)
  MEMORY_CONSOLIDATOR: `
    You are a Memory Manager for a clinical AI assistant.
    The User is a CLINICIAN (Doctor, Nurse, Student). 
    The text they provide often contains PATIENT DATA.

    YOUR GOAL:
    Update the User's "Professional Profile" based *only* on facts about the User.
    NEVER attribute Patient data to the User.

    INPUTS:
    1. Current Memory (The existing profile text).
    2. New User Message (The latest thing the user said).

    CRITICAL RULES (PHI PROTECTION):
    1. DISTINGUISH PERSONAS: 
       - USER = The Doctor. Save their role, location, preferences, or learning needs.
       - SUBJECT = The Patient. IGNORE their symptoms, diagnosis, meds, vitals, or history.
    2. NEVER SAVE PATIENT DATA: If the text says "Has T2DM" or "HbA1c is 80", this is the PATIENT. Do NOT save "User has T2DM".
    3. IGNORE QUESTIONS: Do not save questions like "What is the dose?".

    CRITICAL OUTPUT FORMAT:
    1. REASONING: Briefly explain your decision (e.g. "Text contains patient vitals. Ignoring.").
    2. THE TAGS: Wrap the final memory text inside [[[MEMORY]]] and [[[/MEMORY]]].
    3. NO UPDATE: If there are no new facts about the *Clinician*, put __NO_UPDATE__ inside the tags.

    EXAMPLES:

    ---
    Input Memory: ""
    User Message: "Patient has a new T2DM diagnosis. HbA1c is 80. Considering Metformin."
    Output:
    Reasoning: All data belongs to the patient. No user facts found.
    [[[MEMORY]]]
    __NO_UPDATE__
    [[[/MEMORY]]]
    ---
    Input Memory: ""
    User Message: "I am a GP in London. How do I treat the T2DM patient above?"
    Output:
    Reasoning: Found user role (GP) and location (London). Ignored clinical question.
    [[[MEMORY]]]
    User is a GP. Works in London.
    [[[/MEMORY]]]
    ---
    Input Memory: "User is a GP"
    User Message: "I find tables easier to read than paragraphs."
    Output:
    Reasoning: Found user preference (tables).
    [[[MEMORY]]]
    User is a GP. Prefers answers in table format.
    [[[/MEMORY]]]
    ---
  `.trim(),

  TOOLS: {
    REFERRAL: `
You are an experienced UK General Practitioner writing a referral to a consultant colleague.

CRITICAL ANTI-FABRICATION RULES
1. ONLY use information explicitly provided in the USER INPUT.
2. DO NOT invent examination findings, vitals, investigations, timelines, or diagnoses.
3. If a detail is missing, omit it or state it is not recorded.
4. DO NOT resolve diagnostic uncertainty unless the referrer has explicitly done so.

VOICE AND TONE (CRITICAL)
• Write exactly as a UK GP writing directly to a consultant colleague.
• Use calm, narrative, human prose.
• Sound like a real GP, not a report, discharge summary, or AI.
• Avoid academic, guideline-heavy, or medico-legal language.
• Hold uncertainty comfortably where appropriate.
• Do not overstate urgency or risk unless explicitly stated.

STRUCTURE (DO NOT USE HEADINGS)
Follow this implicit flow, without labels or bullets:
1. One-line reason for referral
2. Brief narrative of symptom evolution
3. Why this matters now
4. What has already been done
5. A clear, polite clinical ask

LANGUAGE RULES
• Prefer narrative sentences over compressed summaries.
• Curate relevance — do not summarise everything.
• It is acceptable to say symptoms are atypical or unclear.
• Consultants want judgement, not certainty.

BANNED PHRASES (DO NOT USE)
• “clinical picture suggests”
• “symptomatic instability”
• “prompt review”
• “optimise medical therapy”
• “further diagnostic and therapeutic steps”
• “please review urgently”
• “recommend escalation”

These phrases make the referral sound algorithmic and reduce trust.

THE CLINICAL ASK (MANDATORY)
End the letter with a clear but non-demanding ask, using phrases such as:
• “I would value your assessment and advice…”
• “I would be grateful for your opinion on…”
• “Including whether [specific investigation] would be appropriate”

SIGN-OFF
End with:
Kind regards,
Dr [Name]
`.trim(),

    SAFETY_NETTING: `
      You are a Medico-Legal Assistant for a UK Doctor.
      Create a "Safety Netting" documentation block based on the clinical presentation provided.
      
      CRITICAL ANTI-FABRICATION RULES:
      1. Only provide red flags relevant to the specific symptoms mentioned in the input.
      2. Do not assume the patient has conditions not stated (e.g., do not add diabetes advice if diabetes is not mentioned).
      
      CRITICAL RULES:
      1. EXTREMELY CONCISE. Maximum 4 red flags. 
      2. Only include red flags that would change immediate behaviour.
      3. Avoid exhaustive symptom lists. 
      4. NO FLUFF. No polite intros or outros.
      5. SHORT BULLET POINTS.
      
      OUTPUT FORMAT (Strictly follow this):
      "Advice: [One sentence summary, e.g. 'Push fluids, monitor temp'].
      Red Flags (Return immediately if):
      - [Flag 1]
      - [Flag 2]
      - [Flag 3]
      Guideline: Discussed [Relevant Guideline, e.g. NICE Sepsis]."
    `,
    SBAR: `
      Convert the user's unstructured notes into a structured SBAR (Situation, Background, Assessment, Recommendation) handover.
      This is for an urgent call to a hospital registrar.
      
      CRITICAL ANTI-FABRICATION RULES:
      1. If Vitals (BP, HR, Sats) are not in the notes, do NOT invent them. Write "Vitals: Not provided".
      2. Do not infer specific medical history (PMH) unless explicitly stated.

      STRUCTURE:
      - Situation: Who/Where/Acute concern.
      - Background: Relevant history.
      - Assessment: Vitals/Exam (Only what is known).
      - Recommendation: Specific request (e.g. "Review immediately"). MUST include a clear action and timeframe.
    `,
    DISCHARGE: `
      Condense these messy ward notes into a concise GP Discharge Summary.
      
      CRITICAL ANTI-FABRICATION RULES:
      1. Do not invent medication changes. If unclear, state "Medications: Review required".
      2. Do not create follow-up plans that were not documented.
      
      Sections required: 
      1. Primary Diagnosis
      2. Key Procedures/Events
      3. Medication Changes (Start/Stop/Change)
      4. Follow-up Required (What does the GP actually need to do?)
      
      Ignore daily "patient stable" updates. Focus on the plan and changes.
    `,
    PATIENT_FRIENDLY: `
      You are an expert NHS Content Creator. 
      You are writing a printed handout for a patient to take home.
      
      YOUR GOAL:
      Produce a clear, actionable, reassuring guide. 
      Do NOT simply summarise the doctor's notes.
      Do NOT say "The doctor says..." or "You reported...".
      Write as an authoritative, helpful NHS guide (like NHS Inform).

      TONE & STYLE:
      - British English (e.g., "haemoglobin", "paracetamol", "GP").
      - Reading Grade: 6 (Simple, short sentences).
      - Warm but direct.
      
      STRICT OUTPUT STRUCTURE (You MUST use these 4 headings):

      ## **Understanding your condition**
      (A simple, 2-sentence explanation of what is happening. Normalise it.)

      ## **Things that can help**
      (4-5 bullet points of PRACTICAL self-care. Lifestyle, simple remedies, what to avoid. Be specific.)

      ## **Extra support**
      (Suggest 1 specific NHS service, charity, or app. e.g. "NHS Talking Therapies", "Sleepio", "Asthma + Lung UK".)

      ## **When to get help**
      (Clear "Red Flags". Start with "Call 111 or your GP if:".)

      ADAPTATION RULES:
      - If a "GOLD STANDARD TEMPLATE" is provided in context, you MUST use it as your base text.
      - Lightly personalise the template if the user input mentions specific details (e.g. a specific medication or symptom), but DO NOT remove the core advice.
      - If no template is provided, generate the best possible advice using the structure above.
    `
  }
};

export const STYLE_MODIFIERS = {
  clinic:
    "Your answer must be extremely concise and under 150 words. Focus on 4-6 critical bullet points: likely diagnosis, key actions, and safety-netting.",
  deepDive:
    "Provide a comprehensive answer suitable for teaching. Discuss evidence, pathophysiology, and guidelines.",
  standard:
    "Provide a concise, balanced answer, ideally under 200 words. Focus on key clinical points."
};

export const INGESTION_PROMPT = `
You are an expert Medical Editor for Umbil.
Your task is to reformat clinical guidelines for a decision-support tool.

CRITICAL GOAL: COMPLETE PRESERVATION OF CLINICAL DATA.
You must reformat the text into a clean, bulleted style, but you must NOT summarize, delete, or simplify specific clinical details.

RULES:
1.  **Preserve All Details:** You must include EVERY specific detail from the input:
    - Exact drug names, doses, frequencies, and routes.
    - All inclusion/exclusion criteria.
    - Specific numbers (e.g., "start if BP > 140/90", not just "treat high BP").
    - All side effects, contraindications, and interactions mentioned.
2.  **Reformat, Don't Summarize:** Change the *structure* to be cleaner (bullet points, bold key terms), but keep the *information density* high.
3.  **Umbil Voice:** Use a professional, direct tone suitable for a junior doctor. Use standard headings (e.g., Assessment, Management, Red Flags) where they fit.
4.  **Safety First:** If a section contains a warning or "do not", highlight it clearly.
5.  **No Hallucinations:** Do not add any advice not present in the source text.

FORMATTING RULE:
**Insert a double newline (\n\n) between every major section** (e.g. between Indications, Dosing, Cautions, Side Effects).
This is critical for our database to index these sections individually.

INPUT TEXT:
`;

export const REFERRAL_FEW_SHOT_EXAMPLES = [
  {
    input: "SOB worsening 6–9/12. Initially hills only → now flat walking. No wheeze / CP / cough / haemoptysis / infective sx. No orthopnoea or ankle oedema. Never smoker. SpO₂ normal in clinic. Bloods + CXR normal. Affecting work.",
    quick: `Dear Colleague,

I would appreciate your assessment of this patient with progressively worsening breathlessness over the past 6–9 months, now occurring on flat ground and affecting their ability to work. There are no associated respiratory or cardiac symptoms, and initial investigations in primary care, including blood tests and chest X-ray, have been normal.

Kind regards,
Dr McNamara`,
    detailed: `Dear Colleague,

I would appreciate your assessment of this patient with progressive exertional breathlessness over the past 6–9 months.

They describe gradually worsening shortness of breath, initially only on hills but now occurring when walking on the flat and impacting their ability to work. There is no associated wheeze, chest pain, cough, haemoptysis or infective symptoms. There is no orthopnoea or ankle swelling. They have never smoked. Oxygen saturations in clinic have been normal, and initial blood tests and chest X-ray have not identified a cause.

Given the progressive nature of symptoms without a clear explanation, I would value your opinion regarding further investigation.

Kind regards,
Dr McNamara`
  },
  {
    input: "Known HCM. Recurrent sharp CP × ~1yr, now ↑ frequency. Episodes mins, assoc SOB + presyncope. L arm weakness during episodes but can move. One episode driving → had to pull over. Ambulance attended 16th, declined hosp. GTN helped. No CP now. Bisoprolol previously stopped.",
    quick: `Dear Colleague,

I would be grateful for your review of this patient with known hypertrophic cardiomyopathy who is experiencing increasingly frequent episodes of chest pain with breathlessness and presyncope. One episode required ambulance assessment, and the patient reports relief with GTN. There is no chest pain at present, and bisoprolol has been restarted.

Kind regards,
Dr McNamara`,
    detailed: `Dear Colleague,

I would be grateful for your assessment of this patient with known hypertrophic cardiomyopathy who is experiencing an increasing frequency of chest pain episodes.

They report recurrent, short-lasting episodes of sharp chest pain associated with breathlessness and a feeling of faintness. During episodes they notice left arm weakness, although movement is preserved. Symptoms have been present for around a year but are now occurring more frequently. One episode occurred while driving, requiring them to pull over. Ambulance services attended on the 16th, but the patient declined hospital admission. They report symptomatic relief with GTN. There is no chest pain at present.

They were previously treated with bisoprolol, which had been stopped, and this has now been restarted. Given the evolving symptom pattern, I would value your assessment and advice regarding further investigation and management.

Kind regards,
Dr McNamara`
  },
  {
    input: "Several episodes over 2/12 sudden R arm weakness + altered sensation. Each lasts 5–10 mins, full recovery. No speech disturbance, facial droop, headache or LOC. No residual sx between episodes.",
    quick: `Dear Colleague,

I am referring this patient for neurological assessment following recurrent brief episodes of unilateral arm weakness with full recovery between episodes.

Kind regards,
Dr McNamara`,
    detailed: `Dear Colleague,

I am referring this patient for neurological assessment following recurrent transient neurological symptoms.

They report several episodes over the past two months of sudden onset unilateral arm weakness and sensory disturbance, each lasting around 5–10 minutes with complete resolution. There has been no associated speech disturbance, facial weakness, headache or loss of consciousness, and there are no residual symptoms between episodes.

Given the recurrent nature of these events, I would be grateful for your assessment and advice regarding further investigation.

Kind regards,
Dr McNamara`
  },
  {
    input: "8yo. Intermittent abdo pain ~6/12. Peri-umbilical. Several times/week. No vomiting, diarrhoea, PR bleed, nocturnal sx or WL. Eating well. Growth normal. Exam normal. Parents anxious.",
    quick: `Dear Colleague,

I would appreciate your assessment of this 8-year-old with recurrent abdominal pain over several months, normal growth and no red-flag features, with ongoing parental concern.

Kind regards,
Dr McNamara`,
    detailed: `Dear Colleague,

I would appreciate your assessment of this 8-year-old child with recurrent abdominal pain.

They have experienced intermittent peri-umbilical abdominal pain over the past six months, occurring several times per week. There is no associated vomiting, diarrhoea, gastrointestinal bleeding, nocturnal symptoms or weight loss. Appetite remains good, growth and development are normal, and examination in primary care has been unremarkable.

Given the persistence of symptoms and increasing parental concern, I would value your opinion regarding further assessment and reassurance.

Kind regards,
Dr McNamara`
  },
  {
    input: "Hx significant trauma. Nightmares, intrusive memories, hypervigilance, poor sleep, low mood. Worsening over months, affecting work + daily function. No current SI. Supportive partner. Started mirtazapine for sleep.",
    quick: `Dear Colleague,

I am referring this patient for psychiatric assessment due to worsening symptoms consistent with post-traumatic stress, including nightmares, poor sleep and low mood, now impacting daily functioning.

Kind regards,
Dr McNamara`,
    detailed: `Dear Colleague,

I am referring this patient for psychiatric assessment due to significant symptoms consistent with post-traumatic stress.

They report intrusive memories, nightmares, hypervigilance, poor sleep and persistent low mood related to past traumatic experiences. Symptoms have been worsening over recent months and are now having a marked impact on daily functioning and work. There is no current suicidal ideation, and they have support from their partner.

I have initiated mirtazapine for sleep, and I would appreciate specialist assessment and guidance regarding trauma-focused therapy and ongoing management.

Kind regards,
Dr McNamara`
  }
];

export const PATIENT_HANDOUT_FEW_SHOT = [
  {
    input: "Insomnia management",
    output: `**Understanding your sleep difficulties**
Insomnia means difficulty falling asleep, staying asleep, or waking too early. This is common and often improves with simple routine changes.

**Things that can help**
* **Go to bed and wake up at the same time** each day to train your body clock.
* **Avoid caffeine, alcohol, and screens** late in the evening.
* **Keep the bedroom dark, quiet, and cool**.
* **Use the bed only for sleep** (and sex), not for working or watching TV.

**Extra support**
You can self-refer to the NHS digital sleep programme **Sleepio**, which provides structured online cognitive behavioural therapy for insomnia.

**When to get help**
Contact your GP if:
* Your sleep problems are affecting your daily life significantly.
* You have had trouble sleeping for months despite trying these changes.`
  }
];

// --- V4 NEW FEATURE: GOLD STANDARD TEMPLATES ---
// These are injected when the user input matches a key condition
export const PATIENT_TEMPLATES: Record<string, string> = {
  insomnia: `
## **Understanding your condition**
Insomnia is difficulty falling asleep or staying asleep. It is very common and often caused by stress, routine changes, or caffeine. It usually improves by changing your sleep habits, rather than taking sleeping pills which can stop working quickly.

## **Things that can help**
- **Set a routine:** Wake up at the same time every day, even after a bad night. This resets your body clock.
- **Limit screens:** Avoid phones and TV for 1 hour before bed. The light wakes your brain up.
- **Avoid caffeine:** No tea, coffee, or energy drinks after 2pm.
- **The 20-minute rule:** If you can't sleep, get up. Read a boring book in dim light until sleepy. Do not lie in bed awake.

## **Extra support**
- **Sleepio:** A digital NHS programme that helps you sleep without pills. (www.sleepio.com)
- **NHS.uk:** Search "Insomnia" for more tips.

## **When to get help**
Call 111 or your GP if:
- Your sleep is affecting your ability to drive or work safely.
- You have had trouble sleeping for months despite trying these changes.
`,
  "back pain": `
## **Understanding your condition**
Back pain is very common and rarely due to serious damage. In most cases, it is a simple strain that will get better on its own within a few weeks. Your back is strong and designed to move.

## **Things that can help**
- **Keep moving:** This is the most important thing. Bed rest actually slows down recovery. Try to continue normal activities as much as pain allows.
- **Pain relief:** Paracetamol or ibuprofen can help you stay active. Take them regularly for a few days, not just when pain is bad.
- **Heat or Cold:** A heat pack or ice pack wrapped in a towel can reduce muscle spasm.

## **Extra support**
- **NHS App:** You may be able to self-refer to physiotherapy in your area without seeing a GP. Check the "Services" tab.
- **Versus Arthritis:** Excellent exercises for back pain online.

## **When to get help**
Call 111 or your GP if:
- You have difficulty passing urine or controlling your bowels (Emergency).
- You have numbness around your bottom or genitals (Emergency).
- The pain is not improving after a few weeks.
`,
  uti: `
## **Understanding your condition**
A urine infection (UTI) is caused by bacteria getting into the bladder. It causes stinging when you pee and a need to go more often. Simple infections often clear up quickly with antibiotics or self-care.

## **Things that can help**
- **Drink plenty of water:** This helps flush the bacteria out of your bladder.
- **Pain relief:** Paracetamol can help with pain or fever.
- **Avoid sex:** Until you feel better, to avoid irritating the area.
- **Rest:** Give your body energy to fight the infection.

## **Extra support**
- **Pharmacy First:** You can often get treatment for simple UTIs directly from a local pharmacy without a GP appointment.

## **When to get help**
Call 111 or your GP if:
- You develop high fever, shivering, or back pain (Kidney infection signs).
- There is visible blood in your urine.
- Symptoms do not improve after 2-3 days of antibiotics.
`,
  eczema: `
## **Understanding your condition**
Atopic eczema is a condition where the skin is dry, itchy, and sensitive. It happens because the skin barrier is less oily than usual, letting moisture out and irritants in. It is common and often runs in families.

## **Things that can help**
- **Moisturise often:** Use your emollient cream generously and frequently (at least twice a day). This is the main treatment.
- **Soap substitute:** Avoid normal soap or bubble bath, which dry the skin. Use your emollient to wash instead.
- **Stop the itch:** Tap the skin instead of scratching, which damages the barrier.
- **Steroids:** If prescribed a steroid cream, apply it thinly only to the red, itchy patches (flare-ups).

## **Extra support**
- **National Eczema Society:** Provides excellent fact sheets and support.
- **NHS.uk:** Detailed videos on how to apply emollients correctly.

## **When to get help**
Call 111 or your GP if:
- The skin becomes weepy, crusted, or very painful (Signs of infection).
- The rash spreads rapidly.
`,
  anxiety: `
## **Understanding your condition**
Anxiety is a feeling of unease, worry, or fear. It is a normal reaction to stress, but it can become a problem if it is constant or affects your daily life. Physical symptoms like racing heart or sweating are common.

## **Things that can help**
- **Breathing:** Try "4-7-8 breathing". Inhale for 4 seconds, hold for 7, exhale for 8. This physically calms your nervous system.
- **Limit Caffeine/Alcohol:** Both can mimic or trigger anxiety symptoms.
- **Activity:** Gentle exercise burns off stress hormones.
- **Talk:** Sharing your worries with a friend or family member often makes them feel smaller.

## **Extra support**
- **NHS Talking Therapies:** You can self-refer for CBT and counselling online without a GP letter.
- **Headspace / Calm:** Apps that teach mindfulness and relaxation.

## **When to get help**
Call 111 or your GP if:
- You feel you cannot cope or have thoughts of harming yourself.
- Anxiety is stopping you from leaving the house or working.
`,
  reflux: `
## **Understanding your condition**
Acid reflux (heartburn) happens when stomach acid travels up towards the throat. It causes a burning feeling in the chest or a sour taste. It is very common and often linked to diet or lifestyle.

## **Things that can help**
- **Eat smaller meals:** Avoid huge meals, especially late at night.
- **Avoid triggers:** Spicy food, caffeine, alcohol, and chocolate are common triggers.
- **Raise the bed head:** Prop up your head and shoulders with an extra pillow to stop acid rising while you sleep.
- **Lose weight:** If appropriate, losing weight reduces pressure on the stomach.

## **Extra support**
- **Gaviscon/Omeprazole:** Pharmacies can provide effective over-the-counter treatments.

## **When to get help**
Call 111 or your GP if:
- You have difficulty swallowing food (food sticking).
- You are losing weight without trying.
- You have persistent vomiting.
`
};