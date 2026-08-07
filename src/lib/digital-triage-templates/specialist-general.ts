// Obstetrics, medicines, suspected-cancer pathways, mental health, and generic fallback.
import type { TriageScaffold } from "./types";

export const TEMPLATES: Record<string, TriageScaffold> = {
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
