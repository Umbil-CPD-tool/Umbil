// src/lib/digital-triage-templates.ts
// UK clinical triage scaffolds (NICE CKS / NICE guidance / NHS.uk themes).
// Patient-facing questions use plain English — no clinical jargon in replies.
// Screening questions only — never diagnose or assign urgency/disposition.

export type TriageScaffold = {
  label: string;
  category: string;
  aliases: string[];
  assessmentQuestions: string[];
  redFlagQuestions: string[];
  safetyTriggers: string[];
  guidanceRef: string;
};

/** One patient-facing paragraph — do not label as "safety netting". Triggers are woven in by the model. */
export const STANDARD_SAFETY_CLOSER =
  "If you develop [key warning symptoms], or your symptoms become significantly worse, please seek urgent medical attention or contact NHS 111/999 while awaiting our reply.";

export const DIGITAL_TRIAGE_TEMPLATES: Record<string, TriageScaffold> = {
  HEADACHE: {
    label: "Headache",
    category: "Neurology",
    aliases: ["headache", "migraine", "head pain", "cephalgia"],
    assessmentQuestions: [
      "When did the headache start, and is it getting worse?",
      "Where is the pain, and what does it feel like (for example throbbing or pressure)?",
      "How bad is it from 0 to 10, and does anything make it better or worse?",
      "Have you had headaches like this before?",
      "Any feeling sick, or finding bright lights or loud sounds hard to cope with?",
    ],
    redFlagQuestions: [
      "Did it come on very suddenly and become as bad as it gets within a few minutes?",
      "Any high temperature, stiff neck, or recent bang to the head?",
      "Any new weakness, numbness, trouble speaking, or changes in your vision?",
      "Any confusion, unusual sleepiness, or being sick for no clear reason?",
      "Is the headache waking you from sleep, or different from your usual headaches?",
    ],
    safetyTriggers: [
      "a sudden severe headache",
      "high temperature with a stiff neck",
      "new weakness, trouble speaking, or vision problems",
      "confusion or collapse",
    ],
    guidanceRef: "NICE CKS Headache - assessment; NICE CG150",
  },

  CHEST_PAIN: {
    label: "Chest pain",
    category: "Cardiology",
    aliases: ["chest pain", "chest discomfort", "chest tightness", "central chest"],
    assessmentQuestions: [
      "When did the chest pain start, and is it constant or does it come and go?",
      "Where exactly is the pain, and what does it feel like?",
      "Is it worse when you breathe, move, or walk about?",
      "Have you had pain like this before, or any heart or lung problems?",
      "Any recent illness, injury, long journey, or a long time sitting still?",
    ],
    redFlagQuestions: [
      "Does the pain spread to your arm, jaw, neck, or back?",
      "Any shortness of breath, sweating, feeling sick, or feeling faint?",
      "Are you coughing up blood?",
      "Is the pain severe or getting worse quickly?",
    ],
    safetyTriggers: [
      "severe or worsening chest pain",
      "pain spreading to your arm, jaw or neck",
      "shortness of breath, sweating or collapse",
      "coughing up blood",
    ],
    guidanceRef: "NICE CKS Chest pain; NICE NG185",
  },

  ABDOMINAL_PAIN: {
    label: "Abdominal pain",
    category: "Gastroenterology",
    aliases: [
      "abdominal pain",
      "abdo pain",
      "abdomen pain",
      "stomach pain",
      "tummy pain",
      "belly pain",
      "epigastric",
    ],
    assessmentQuestions: [
      "When did the pain start, and where exactly is it?",
      "Is it getting worse, and does anything make it better or worse?",
      "Any being sick, diarrhoea, constipation, or bloating?",
      "Are you able to eat and drink?",
      "Have you had pain like this before?",
    ],
    redFlagQuestions: [
      "Any blood in your poo, black poo, or vomiting blood?",
      "Any high temperature, or pain that wakes you from sleep?",
      "Have you been losing weight without trying?",
      "Is the pain severe and getting worse quickly?",
    ],
    safetyTriggers: [
      "severe tummy pain that is getting worse",
      "black poo or vomiting blood",
      "being sick and unable to keep drinks down",
      "high temperature with severe pain",
    ],
    guidanceRef: "NICE CKS Abdominal pain - acute / chronic",
  },

  SHORTNESS_OF_BREATH: {
    label: "Shortness of breath",
    category: "Respiratory",
    aliases: [
      "shortness of breath",
      "short of breath",
      "breathless",
      "breathlessness",
      "difficulty breathing",
      "dyspnoea",
      "dyspnea",
      "sob",
    ],
    assessmentQuestions: [
      "When did the shortness of breath start, and is it getting worse?",
      "Are you short of breath when resting, or only when you walk or move about?",
      "Do you have asthma, a long-term lung condition, or heart problems?",
      "Any cough, wheeze, or recent chest infection?",
      "Any swollen ankles, or a recent long journey / long time sitting still?",
    ],
    redFlagQuestions: [
      "Are you short of breath at rest, or unable to finish a sentence?",
      "Any chest pain?",
      "Are you coughing up blood?",
      "Any confusion, collapse, or blue lips or fingers?",
    ],
    safetyTriggers: [
      "shortness of breath at rest",
      "shortness of breath getting worse quickly",
      "chest pain or coughing up blood",
      "confusion or collapse",
    ],
    guidanceRef: "NICE CKS Breathlessness; NICE NG80 / NG115 where relevant",
  },

  COUGH: {
    label: "Cough",
    category: "Respiratory",
    aliases: ["cough", "coughing"],
    assessmentQuestions: [
      "How long have you had the cough, and is it getting worse?",
      "Are you coughing up any mucus — what colour is it?",
      "Any wheeze, or known asthma or lung problems?",
      "Do you smoke, or have you been around dust or fumes?",
      "Any recent cold or chest infection?",
    ],
    redFlagQuestions: [
      "Are you coughing up blood?",
      "Any increasing shortness of breath or chest pain?",
      "Any night sweats, or losing weight without trying?",
      "Has the cough lasted more than 3 weeks?",
    ],
    safetyTriggers: [
      "coughing up blood",
      "increasing shortness of breath or chest pain",
      "night sweats or losing weight without trying",
      "a cough lasting more than 3 weeks",
    ],
    guidanceRef: "NICE CKS Cough; NICE NG12 (suspected cancer pathways)",
  },

  BACK_PAIN: {
    label: "Back pain",
    category: "Musculoskeletal",
    aliases: ["back pain", "lower back", "lumbago", "sciatica"],
    assessmentQuestions: [
      "When did the back pain start, and is it getting worse?",
      "Does the pain go down into your legs?",
      "What makes it better or worse?",
      "Have you had back pain like this before?",
      "What have you already tried for the pain?",
    ],
    redFlagQuestions: [
      "Any trouble peeing, leaking urine or soiling yourself, or numbness around your bottom or between your legs?",
      "Any weakness or numbness in your legs that is getting worse?",
      "Any high temperature, or losing weight without trying?",
      "Any recent bad fall or injury?",
    ],
    safetyTriggers: [
      "trouble peeing, leaking urine, or soiling yourself",
      "numbness around your bottom or between your legs",
      "leg weakness that is getting worse",
      "high temperature or losing weight without trying with back pain",
    ],
    guidanceRef: "NICE NG59 Low back pain and sciatica; NICE CKS Back pain - low (without radiculopathy)",
  },

  FEVER_ADULT: {
    label: "Fever (adult)",
    category: "Infection",
    aliases: ["fever", "high temperature", "pyrexia", "feeling feverish"],
    assessmentQuestions: [
      "How long have you had the high temperature, and what is the highest you have measured?",
      "Any cough, sore throat, burning when you pee, diarrhoea, or rash?",
      "Are you able to drink and pee as usual?",
      "Any recent travel, hospital stay, or known infection risk?",
      "Any long-term illnesses, or treatment that weakens your immune system?",
    ],
    redFlagQuestions: [
      "Any confusion, unusual sleepiness, or a bad headache with a stiff neck?",
      "Any trouble breathing?",
      "Any rash that does not fade when you press a clear glass on it?",
      "Keep being sick, or feeling so unwell you cannot manage at home?",
    ],
    safetyTriggers: [
      "confusion or unusual sleepiness",
      "trouble breathing",
      "a bad headache with a stiff neck",
      "a rash that does not fade under a glass",
      "feeling very unwell",
    ],
    guidanceRef: "NICE NG51 Sepsis; NICE CKS Feverish illness",
  },

  FEVER_CHILD: {
    label: "Fever (child)",
    category: "Paediatrics",
    aliases: ["child fever", "fever child", "baby fever", "toddler fever", "paediatric fever"],
    assessmentQuestions: [
      "How old is the child, and how long have they had a high temperature?",
      "Are they drinking, peeing, and playing or interacting as usual?",
      "Any cough, cold symptoms, ear pain, being sick, or diarrhoea?",
      "Have they had any recent vaccinations, or been around anyone who is unwell?",
      "What temperature have you measured, and how did you take it?",
    ],
    redFlagQuestions: [
      "Are they unusually sleepy or hard to wake?",
      "Any trouble breathing or grunting?",
      "Any rash that does not fade when you press a clear glass on it?",
      "Are they not drinking or not peeing?",
      "Has the high temperature lasted more than 5 days, or are you worried they are seriously unwell?",
    ],
    safetyTriggers: [
      "unusually sleepy or hard to wake",
      "trouble breathing",
      "a rash that does not fade under a glass",
      "not drinking or not peeing",
      "you are worried they are seriously unwell",
    ],
    guidanceRef: "NICE NG143 Fever in under 5s; NICE NG51 Sepsis",
  },

  CHILD_ILLNESS: {
    label: "Child illness",
    category: "Paediatrics",
    aliases: [
      "unwell child",
      "sick child",
      "my child",
      "my baby",
      "my toddler",
      "paediatric",
      "poor feeding",
      "not feeding",
    ],
    assessmentQuestions: [
      "How old is the child, and what is the main worry?",
      "How long have they been unwell?",
      "Are they drinking, feeding, and peeing as usual?",
      "Any high temperature, cough, rash, being sick, or diarrhoea?",
      "Are they more sleepy, more irritable, or less playful than usual?",
    ],
    redFlagQuestions: [
      "Are they unusually sleepy or hard to wake?",
      "Any trouble breathing, pauses in breathing, or looking blue?",
      "Any rash that does not fade when you press a clear glass on it?",
      "Any ongoing being sick, blood in their poo, or severe pain?",
      "Are you unable to get them to take drinks?",
    ],
    safetyTriggers: [
      "unusually sleepy or hard to wake",
      "trouble breathing or looking blue",
      "a rash that does not fade under a glass",
      "unable to take drinks",
      "you are worried they are seriously unwell",
    ],
    guidanceRef: "NICE NG143 Fever in under 5s; NHS.uk When to worry about a child's fever",
  },

  EAR_PAIN: {
    label: "Ear pain",
    category: "ENT",
    aliases: ["ear pain", "earache", "ear ache", "otalgia", "otitis", "ear infection"],
    assessmentQuestions: [
      "Which ear hurts, and how long has the pain been there?",
      "Any change in hearing, fluid from the ear, or a blocked feeling?",
      "Any recent cold, swimming, or knock to the ear?",
      "Any high temperature or feeling generally unwell?",
      "Have you had ear problems like this before?",
    ],
    redFlagQuestions: [
      "Any bad swelling behind or around the ear, or the ear sticking out?",
      "Any drooping of the face, bad headache, or stiff neck?",
      "Any dizziness with being sick, or sudden complete loss of hearing?",
      "Any blood or smelly fluid coming from the ear?",
    ],
    safetyTriggers: [
      "swelling behind the ear or the ear sticking out",
      "drooping of the face",
      "a bad headache or stiff neck",
      "sudden loss of hearing",
    ],
    guidanceRef: "NICE CKS Otitis media - acute; NICE CKS Otitis externa",
  },

  PREGNANCY: {
    label: "Pregnancy problems",
    category: "Obstetrics",
    aliases: [
      "pregnant",
      "pregnancy",
      "antenatal",
      "weeks pregnant",
      "weeks gestation",
      "miscarriage",
      "bleeding in pregnancy",
      "reduced movements",
      "baby not moving",
    ],
    assessmentQuestions: [
      "How many weeks pregnant are you (or when is your due date)?",
      "What is the main symptom or worry?",
      "Any bleeding from the vagina, or fluid leaking?",
      "Any tummy pain or backache?",
      "Have you felt your baby's movements as usual (if you usually feel them)?",
    ],
    redFlagQuestions: [
      "Any heavy bleeding, clots, or feeling faint or dizzy?",
      "Any bad headache, blurred vision, or pain high up in your tummy?",
      "Have your baby's movements reduced or stopped?",
      "Any high temperature, smelly discharge, or severe being sick?",
      "Any chest pain, shortness of breath, or swelling in one calf?",
    ],
    safetyTriggers: [
      "heavy bleeding or feeling faint",
      "your baby's movements reduced or stopped",
      "a bad headache, vision changes, or pain high in your tummy",
      "chest pain, shortness of breath or calf swelling in pregnancy",
    ],
    guidanceRef: "NICE NG201 Antenatal care; NICE NG126 Ectopic pregnancy and miscarriage; NHS.uk pregnancy symptoms",
  },

  MEDICATION_QUERY: {
    label: "Medication query",
    category: "Medicines",
    aliases: [
      "medication",
      "medicine",
      "tablet",
      "tablets",
      "side effect",
      "side effects",
      "ran out of",
      "prescription",
      "dose",
      "missed dose",
      "drug",
    ],
    assessmentQuestions: [
      "Which medicine is this about, and what dose / how often do you take it?",
      "What is your question (side effect, running out, dose, or mixing with other medicines)?",
      "When did the problem start?",
      "Are you taking any other medicines, including ones from the chemist or herbal remedies?",
      "Any allergies to medicines?",
    ],
    redFlagQuestions: [
      "Any trouble breathing, or swelling of your face, lips or tongue, or a widespread rash after a medicine?",
      "Any chest pain, collapse, or severe being sick after starting a medicine?",
      "Are you unable to take an important regular medicine (for example insulin, epilepsy or heart medicine)?",
      "Any thoughts of taking more than prescribed, or an overdose?",
    ],
    safetyTriggers: [
      "trouble breathing or swelling of the face, lips or tongue",
      "collapse or a severe reaction after a medicine",
      "unable to take an important regular medicine",
      "possible overdose",
    ],
    guidanceRef: "NICE / BNF medicines guidance; NHS.uk medicines",
  },

  LYMPHADENOPATHY: {
    label: "Swollen glands / lump",
    category: "General",
    aliases: ["lymph node", "swollen gland", "lymphadenopathy", "neck lump", "swollen nodes"],
    assessmentQuestions: [
      "Where is the lump or swollen gland, and how long has it been there?",
      "Is it tender, and is it getting bigger?",
      "Any recent infection nearby (throat, ear or skin)?",
      "Have you noticed any other lumps elsewhere?",
    ],
    redFlagQuestions: [
      "Is it hard, stuck in place, or above your collar bone?",
      "Any night sweats, unexplained high temperature, or losing weight without trying?",
      "Has it been there more than 3 weeks without getting better?",
    ],
    safetyTriggers: [
      "a lump that is growing quickly, hard or stuck in place",
      "night sweats or losing weight without trying",
      "an unexplained high temperature that will not settle",
    ],
    guidanceRef: "NICE NG12 Suspected cancer; NICE CKS Neck lump",
  },

  RECTAL_BLEEDING: {
    label: "Rectal bleeding",
    category: "Gastroenterology",
    aliases: [
      "rectal bleeding",
      "blood in stool",
      "blood in poo",
      "fresh blood pr",
      "pr bleeding",
      "bleeding from the bottom",
    ],
    assessmentQuestions: [
      "When did you first notice the bleeding, and how much blood have you seen?",
      "Is the blood mixed in the poo, on the paper, or in the toilet?",
      "Any change in your usual bowel habits, or tummy pain?",
      "Have you had piles or bleeding like this before?",
    ],
    redFlagQuestions: [
      "Any black poo, or large amounts of blood?",
      "Any losing weight without trying, or unusual tiredness?",
      "Any dizziness or feeling faint?",
      "Any severe tummy pain?",
    ],
    safetyTriggers: [
      "heavy or ongoing bleeding",
      "black poo",
      "dizziness or feeling faint",
      "severe tummy pain",
    ],
    guidanceRef: "NICE NG12 Suspected cancer; NICE CKS Gastrointestinal tract (lower) cancers - recognition and referral",
  },

  CHANGE_IN_BOWEL_HABIT: {
    label: "Change in bowel habit",
    category: "Gastroenterology",
    aliases: [
      "change in bowel",
      "bowel habit",
      "constipation",
      "altered bowel",
    ],
    assessmentQuestions: [
      "How long has your bowel habit been different, and what has changed?",
      "Any tummy pain or bloating?",
      "Any recent antibiotics, travel, or big changes in what you eat?",
      "Are you more tired than usual?",
    ],
    redFlagQuestions: [
      "Any blood in your poo or black poo?",
      "Have you been losing weight without trying?",
      "Has the change lasted more than 3 weeks?",
      "Have you been told you have low iron / anaemia with no clear cause?",
    ],
    safetyTriggers: [
      "blood in your poo or black poo",
      "losing weight without trying",
      "a change lasting more than 3 weeks",
      "severe tummy pain",
    ],
    guidanceRef: "NICE NG12 Suspected cancer",
  },

  DYSPHAGIA: {
    label: "Difficulty swallowing",
    category: "Gastroenterology",
    aliases: [
      "dysphagia",
      "difficulty swallowing",
      "trouble swallowing",
      "food sticking",
      "swallowing problem",
    ],
    assessmentQuestions: [
      "How long have you had trouble swallowing, and is it getting worse?",
      "Does food or drink stick, and do you choke or cough when swallowing?",
      "Any heartburn, or previous problems with your food pipe?",
      "Does food come back up after swallowing?",
    ],
    redFlagQuestions: [
      "Have you been losing weight without trying?",
      "Any vomiting blood, or keep being sick?",
      "Are you unable to swallow drinks?",
      "Is swallowing getting worse quickly?",
    ],
    safetyTriggers: [
      "trouble swallowing that is getting worse",
      "unable to keep drinks down",
      "vomiting blood",
      "losing weight without trying",
    ],
    guidanceRef: "NICE NG12 Suspected cancer (upper GI)",
  },

  UNINTENTIONAL_WEIGHT_LOSS: {
    label: "Unintentional weight loss",
    category: "General",
    aliases: ["weight loss", "losing weight", "unintentional weight", "lost weight"],
    assessmentQuestions: [
      "How much weight have you lost, and over what time?",
      "Has your appetite changed?",
      "Any ongoing cough, tummy pain, or change in bowel habits?",
      "Any new lumps, or unusual bleeding?",
    ],
    redFlagQuestions: [
      "Any night sweats or an ongoing high temperature with no clear cause?",
      "Any cough lasting more than 3 weeks?",
      "Any blood in your poo or urine, or vomiting blood?",
      "Any swollen glands that are not settling?",
    ],
    safetyTriggers: [
      "ongoing weight loss without trying",
      "night sweats or an ongoing high temperature",
      "a cough lasting more than 3 weeks",
      "unexplained bleeding",
    ],
    guidanceRef: "NICE NG12 Suspected cancer",
  },

  HAEMATURIA: {
    label: "Blood in urine",
    category: "Urology",
    aliases: ["haematuria", "hematuria", "blood in urine", "bloody urine", "pink urine", "red urine"],
    assessmentQuestions: [
      "When did you first notice blood in your urine, and is it still there?",
      "Any pain or burning when you pee, needing to pee often, or sudden urgency?",
      "Any pain in your side or tummy?",
      "Any recent urine infection, or use of a catheter?",
    ],
    redFlagQuestions: [
      "Is the bleeding heavy, or are there clots?",
      "Are you unable to pee?",
      "Any high temperature or feeling very unwell?",
      "Have you been losing weight without trying?",
    ],
    safetyTriggers: [
      "heavy bleeding or clots",
      "unable to pee",
      "high temperature with blood in the urine",
      "severe pain in your side",
    ],
    guidanceRef: "NICE NG12 Suspected cancer; NICE CKS Urological cancers - recognition and referral",
  },

  BREAST_LUMP: {
    label: "Breast lump",
    category: "Breast",
    aliases: ["breast lump", "breast mass", "lump in breast", "breast swelling"],
    assessmentQuestions: [
      "Where is the lump, how long has it been there, and is it changing?",
      "Is it tender, and does it change with your periods?",
      "Any pain or redness?",
      "Any family history of breast problems you think is relevant?",
    ],
    redFlagQuestions: [
      "Any dimpling of the skin, a nipple that has turned in, or fluid from the nipple (especially blood)?",
      "Is the lump getting bigger quickly?",
      "Any high temperature with a red, hot, painful breast?",
    ],
    safetyTriggers: [
      "a lump getting bigger with skin or nipple changes",
      "bloody fluid from the nipple",
      "high temperature with a red painful breast",
    ],
    guidanceRef: "NICE NG12 Suspected cancer; NICE CKS Breast cancer - recognition and referral",
  },

  POSTMENOPAUSAL_BLEEDING: {
    label: "Postmenopausal bleeding",
    category: "Gynaecology",
    aliases: ["postmenopausal bleeding", "post menopausal bleeding", "bleeding after menopause", "pmb"],
    assessmentQuestions: [
      "When did the bleeding start, and how heavy has it been?",
      "Is this the first time since your periods stopped, or has it happened again?",
      "Are you on HRT or any other hormone treatment?",
      "Any vaginal discharge?",
    ],
    redFlagQuestions: [
      "Is bleeding heavy or ongoing?",
      "Any pelvic pain or new swelling of your tummy?",
      "Have you been losing weight without trying?",
      "Any dizziness or feeling faint from blood loss?",
    ],
    safetyTriggers: [
      "heavy or ongoing bleeding",
      "severe pelvic pain",
      "dizziness or feeling faint",
    ],
    guidanceRef: "NICE NG12 Suspected cancer; NICE CKS Gynaecological cancers - recognition and referral",
  },

  TESTICULAR_LUMP: {
    label: "Testicular lump",
    category: "Urology",
    aliases: ["testicular lump", "testicle lump", "lump in testicle", "scrotal lump", "swollen testicle"],
    assessmentQuestions: [
      "Where exactly is the lump or swelling, and how long has it been there?",
      "Is it painful, or does it feel heavy?",
      "Any burning when you pee, or needing to pee more often?",
      "Any recent injury?",
    ],
    redFlagQuestions: [
      "Is it getting bigger quickly?",
      "Any severe pain, redness, or high temperature?",
      "Have you been losing weight without trying?",
    ],
    safetyTriggers: [
      "swelling that is getting bigger quickly",
      "severe pain with a high temperature",
      "sudden severe pain in the testicle",
    ],
    guidanceRef: "NICE NG12 Suspected cancer; NICE CKS Testicular cancer - recognition and referral",
  },

  HEAD_INJURY: {
    label: "Head injury",
    category: "Neurology",
    aliases: ["head injury", "hit head", "bumped head", "concussion", "fell and hit"],
    assessmentQuestions: [
      "When did the injury happen, and what caused it?",
      "Did you black out, or have any memory gaps around the time of the injury?",
      "Are you on blood-thinning medicines (for example warfarin, apixaban or aspirin)?",
      "Any headache since the injury?",
    ],
    redFlagQuestions: [
      "Have you kept being sick?",
      "Any increasing sleepiness, confusion, or a fit / seizure?",
      "Any weakness, vision changes, or clear fluid from your nose or ear?",
      "Any severe headache that is getting worse?",
    ],
    safetyTriggers: [
      "keep being sick",
      "increasing sleepiness or confusion",
      "a fit or seizure",
      "weakness or vision changes after a head injury",
    ],
    guidanceRef: "NICE NG232 Head injury",
  },

  FATIGUE: {
    label: "Fatigue",
    category: "General",
    aliases: ["fatigue", "tired all the time", "exhausted", "tiredness", "low energy", "lethargy"],
    assessmentQuestions: [
      "How long have you felt this tired, and is it getting worse?",
      "Any change in your mood, sleep, or appetite?",
      "Any heavy periods or change in bowel habits?",
      "How is your energy through a usual day?",
    ],
    redFlagQuestions: [
      "Have you been losing weight without trying?",
      "Any ongoing high temperature or night sweats?",
      "Any shortness of breath, chest pain, or swollen glands?",
      "Any new bleeding or black poo?",
    ],
    safetyTriggers: [
      "losing weight without trying",
      "ongoing high temperature or night sweats",
      "shortness of breath or chest pain",
      "swollen glands that are not settling",
    ],
    guidanceRef: "NICE CKS Tiredness/fatigue in adults; NICE NG12 where red flags present",
  },

  PERSISTENT_PAIN: {
    label: "Persistent pain",
    category: "Musculoskeletal",
    aliases: ["persistent pain", "ongoing pain", "chronic pain", "pain not going away"],
    assessmentQuestions: [
      "Where is the pain, how long has it lasted, and is it getting worse?",
      "What does it feel like, and does anything make it better or worse?",
      "What have you already tried for the pain?",
      "How is it affecting your sleep and day-to-day activities?",
    ],
    redFlagQuestions: [
      "Any losing weight without trying, or a high temperature?",
      "Any pain that keeps you awake at night?",
      "Any weakness, numbness, or a new lump near the painful area?",
    ],
    safetyTriggers: [
      "pain getting worse quickly",
      "losing weight without trying, or night pain",
      "new weakness or numbness",
      "a new lump or swelling",
    ],
    guidanceRef: "NICE NG193 Chronic pain; presentation-specific NICE CKS",
  },

  UTI_ADULT: {
    label: "UTI",
    category: "Urology",
    aliases: [
      "uti",
      "cystitis",
      "urine infection",
      "urinary infection",
      "burning urine",
      "dysuria",
      "waterworks",
    ],
    assessmentQuestions: [
      "What urine symptoms do you have (burning, needing to pee often, sudden urgency, or smell)?",
      "How long have they been there, and are they getting worse?",
      "Are you pregnant, or have you had recent urine infections or a catheter?",
      "Have you tried any treatment already?",
    ],
    redFlagQuestions: [
      "Any high temperature, shaking chills, or being sick?",
      "Any pain in your back or side (just below the ribs)?",
      "Any blood in the urine that is not settling?",
      "Are you unable to keep drinks down?",
    ],
    safetyTriggers: [
      "high temperature, shaking chills or feeling very unwell",
      "pain in your back or side",
      "keep being sick",
      "symptoms getting worse after 48 hours of treatment",
    ],
    guidanceRef: "NICE CKS Urinary tract infection (lower) - women / men; NICE NG109",
  },

  DVT_LEG_SWELLING: {
    label: "Leg swelling / possible DVT",
    category: "Vascular",
    aliases: [
      "dvt",
      "leg swelling",
      "calf swelling",
      "swollen leg",
      "swollen calf",
      "deep vein",
      "calf pain",
    ],
    assessmentQuestions: [
      "Which leg is affected, and when did the swelling or pain start?",
      "Is one calf warmer, redder, or more tender than the other?",
      "Any recent surgery, long journey, long time sitting still, or pregnancy?",
      "Are you on the pill or HRT, or have you had a blood clot before?",
    ],
    redFlagQuestions: [
      "Any new or worsening shortness of breath?",
      "Any chest pain or coughing up blood?",
      "Is the leg swelling getting worse quickly?",
      "Any severe calf pain with clear redness or warmth?",
    ],
    safetyTriggers: [
      "shortness of breath or chest pain",
      "coughing up blood",
      "leg swelling getting worse quickly",
      "severe calf pain with redness or warmth",
    ],
    guidanceRef: "NICE NG158 Venous thromboembolic diseases",
  },

  PALPITATIONS: {
    label: "Palpitations",
    category: "Cardiology",
    aliases: [
      "palpitation",
      "heart racing",
      "heart flutter",
      "irregular heartbeat",
      "skipped beat",
      "tachycardia",
    ],
    assessmentQuestions: [
      "When does your heart race or flutter, and how long do episodes last?",
      "Does your heartbeat feel fast, irregular, or both?",
      "Any caffeine, alcohol, new medicine, or illness that might have triggered it?",
      "Have you had heart problems or similar episodes before?",
    ],
    redFlagQuestions: [
      "Any collapse or fainting?",
      "Any chest pain or shortness of breath during episodes?",
      "Any new dizziness or confusion?",
      "Is the fast or irregular heartbeat ongoing and not settling?",
    ],
    safetyTriggers: [
      "collapse or fainting",
      "chest pain or severe shortness of breath",
      "a fast or irregular heartbeat that will not settle",
      "new confusion",
    ],
    guidanceRef: "NICE CKS Palpitations; NICE NG196 Atrial fibrillation where relevant",
  },

  DIZZINESS_VERTIGO: {
    label: "Dizziness / vertigo",
    category: "ENT / Neurology",
    aliases: ["dizziness", "dizzy", "vertigo", "lightheaded", "light headed", "spinning", "unsteady"],
    assessmentQuestions: [
      "Does the room spin, or do you feel lightheaded / about to faint?",
      "When did it start, and is it constant or in episodes?",
      "Any change in hearing or ringing in your ears?",
      "Any recent illness, new medicine, or dizziness when you move your head?",
    ],
    redFlagQuestions: [
      "Any new weakness, numbness, or trouble speaking?",
      "Any severe headache that is getting worse?",
      "Any collapse or fainting?",
      "Any new vision problems, or keep being sick?",
    ],
    safetyTriggers: [
      "new weakness, numbness or trouble speaking",
      "a severe headache",
      "collapse or fainting",
      "sudden loss of vision",
    ],
    guidanceRef: "NICE CKS Vertigo; NICE CKS Blackouts and syncope",
  },

  RASH: {
    label: "Rash",
    category: "Dermatology",
    aliases: ["rash", "spots", "hives", "urticaria", "skin eruption"],
    assessmentQuestions: [
      "Where is the rash, when did it start, and is it spreading?",
      "Does it itch, blister, or feel painful?",
      "Any new medicine, foods, or contact with someone who was unwell?",
      "Have you had a rash like this before?",
    ],
    redFlagQuestions: [
      "Does the rash fade when you press a clear glass on it?",
      "Any high temperature and feeling very unwell?",
      "Any swelling of the face, or trouble breathing?",
      "Is the rash spreading quickly?",
    ],
    safetyTriggers: [
      "a rash that does not fade under a glass",
      "high temperature and feeling very unwell",
      "swelling of the face or trouble breathing",
      "a rash spreading quickly",
    ],
    guidanceRef: "NICE NG51 Sepsis; NICE CKS Meningitis - bacterial meningitis and meningococcal disease",
  },

  SORE_THROAT: {
    label: "Sore throat",
    category: "ENT",
    aliases: ["sore throat", "throat pain", "tonsillitis", "pharyngitis"],
    assessmentQuestions: [
      "How long have you had the sore throat, and is it getting worse?",
      "Any high temperature, swollen glands in the neck, or white spots on the tonsils?",
      "Are you able to drink?",
      "Any recent contact with strep throat or scarlet fever?",
    ],
    redFlagQuestions: [
      "Are you unable to swallow your own spit?",
      "Any trouble breathing, drooling, or a change in your voice (for example muffled)?",
      "Any severe neck swelling or stiffness?",
      "Has a high temperature lasted more than 5 days?",
    ],
    safetyTriggers: [
      "unable to swallow your own spit",
      "trouble breathing",
      "severe neck swelling or stiffness",
      "feeling very unwell",
    ],
    guidanceRef: "NICE CKS Sore throat - acute; NICE NG84",
  },

  DEPRESSION_CRISIS: {
    label: "Mental health",
    category: "Mental health",
    aliases: [
      "depression",
      "low mood",
      "suicidal",
      "self harm",
      "self-harm",
      "mental health crisis",
      "feeling hopeless",
      "anxiety crisis",
      "anxiety",
      "panic attack",
      "mental health",
    ],
    assessmentQuestions: [
      "How long have you been feeling this way, and has it got worse recently?",
      "Are you managing to eat, sleep, and get through day-to-day activities?",
      "Is anyone supporting you at home?",
      "Have you spoken to mental health services or your usual clinician about this before?",
    ],
    redFlagQuestions: [
      "Are you having thoughts of harming yourself or ending your life?",
      "Do you feel able to keep yourself safe right now?",
      "Have you made any plans to act on those thoughts?",
      "Has your mood got rapidly worse, or are you withdrawing from people?",
    ],
    safetyTriggers: [
      "thoughts of self-harm or suicide",
      "feeling unable to keep yourself safe",
      "distress that is getting worse quickly",
    ],
    guidanceRef: "NICE NG222 Depression in adults; NHS.uk mental health crisis; Samaritans 116 123",
  },

  GASTROENTERITIS_VOMITING: {
    label: "Vomiting / gastroenteritis",
    category: "Gastroenterology",
    aliases: [
      "vomiting",
      "gastroenteritis",
      "gastro",
      "food poisoning",
      "throwing up",
      "sick and diarrhoea",
    ],
    assessmentQuestions: [
      "When did the being sick start, and how often are you being sick?",
      "Any diarrhoea?",
      "Are you able to keep any drinks down?",
      "Any recent takeaway, travel, or contact with someone with the same illness?",
    ],
    redFlagQuestions: [
      "Any blood in vomit or poo?",
      "Any severe tummy pain?",
      "Are you peeing much less than usual, or feeling very dizzy?",
      "Have you been being sick for more than 48 hours?",
    ],
    safetyTriggers: [
      "unable to keep drinks down",
      "peeing much less than usual",
      "blood in vomit or poo",
      "severe tummy pain",
    ],
    guidanceRef: "NICE CKS Gastroenteritis; NICE CKS Diarrhoea - adult's assessment",
  },

  DIARRHOEA_ADULT: {
    label: "Diarrhoea",
    category: "Gastroenterology",
    aliases: ["diarrhoea", "diarrhea", "loose stool", "runny stool", "watery stool"],
    assessmentQuestions: [
      "How long have you had diarrhoea, and how often are you going?",
      "Are you managing to drink, and peeing as usual?",
      "Any recent antibiotics, travel, or contact with someone with the same illness?",
      "Any being sick?",
    ],
    redFlagQuestions: [
      "Any blood or mucus in the poo, or black poo?",
      "Any severe tummy pain or high temperature?",
      "Any signs of dehydration (dizziness, very dry mouth, little urine)?",
      "Has diarrhoea lasted more than 7 days?",
    ],
    safetyTriggers: [
      "blood in your poo",
      "severe tummy pain",
      "signs of dehydration",
      "diarrhoea lasting more than 7 days",
    ],
    guidanceRef: "NICE CKS Diarrhoea - adult's assessment",
  },

  NEW_NEUROLOGICAL: {
    label: "New neurological symptoms",
    category: "Neurology",
    aliases: [
      "facial droop",
      "stroke",
      "speech difficulty",
      "slurred speech",
      "can't speak",
      "cannot speak",
      "vision loss",
      "seizure",
      "fit",
      "neurological",
    ],
    assessmentQuestions: [
      "When did the symptoms start, and did they come on suddenly?",
      "Are the symptoms still there now, or did they go away?",
      "Any headache, confusion, or recent illness?",
      "Have you had anything like this before?",
    ],
    redFlagQuestions: [
      "Any weakness in your face, arm or leg — especially on one side?",
      "Any trouble speaking or understanding speech?",
      "Any sudden loss of vision?",
      "Any collapse or a fit / seizure?",
    ],
    safetyTriggers: [
      "sudden weakness of the face, arm or leg",
      "trouble speaking",
      "sudden loss of vision",
      "collapse or a fit",
    ],
    guidanceRef: "NICE NG128 Stroke and transient ischaemic attack; NHS FAST",
  },

  GENERIC: {
    label: "Generic",
    category: "General",
    aliases: [],
    assessmentQuestions: [
      "When did the problem start, and is it getting worse?",
      "Where is the main symptom, and what does it feel like?",
      "Anything that makes it better or worse?",
      "Have you had anything like this before, and what have you already tried?",
    ],
    redFlagQuestions: [
      "Any high temperature, being sick, shortness of breath, or chest pain?",
      "Any confusion, collapse, or feeling very unwell?",
      "Any bleeding that is heavy or unexpected?",
      "Any new weakness, trouble speaking, or vision changes?",
    ],
    safetyTriggers: [
      "symptoms that are severe or getting worse quickly",
      "chest pain or shortness of breath",
      "confusion or collapse",
      "feeling very unwell",
    ],
    guidanceRef: "NHS.uk / general primary care safety-netting principles",
  },
};
