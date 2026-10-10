// GI and musculoskeletal presentations.
import type { TriageScaffold } from "./types";

export const TEMPLATES: Record<string, TriageScaffold> = {
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
};
