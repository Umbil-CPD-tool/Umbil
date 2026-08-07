// Acute cardio / respiratory / neuro / vascular presentations.
import type { TriageScaffold } from "./types";

export const TEMPLATES: Record<string, TriageScaffold> = {
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
};
