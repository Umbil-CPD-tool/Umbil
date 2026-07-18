const GMC_DOMAINS = [
  "Knowledge Skills & Performance",
  "Safety & Quality",
  "Communication Partnership & Teamwork",
  "Maintaining Trust",
];

/** Clinical specialties with keyword cues for classifying free-text questions. */
const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  Cardiology: [
    "cardiac", "cardiology", "heart failure", "chest pain", "angina", "acs",
    "stemi", "nstemi", "myocardial", "troponin", "ecg", "ekg", "arrhythmia",
    "atrial fibrillation", "afib", "hypertension", "blood pressure", "murmur",
    "pericarditis", "endocarditis", "palpitation",
  ],
  Respiratory: [
    "asthma", "copd", "pneumonia", "respiratory", "dyspnoea", "dyspnea",
    "breathless", "shortness of breath", "wheeze", "pulmonary", "pleural",
    "pneumothorax", "oxygen sat", "spirometry", "cough", "tb ", "tuberculosis",
  ],
  Gastroenterology: [
    "gastro", "abdomen", "abdominal", "liver", "hepatic", "cirrhosis",
    "ibd", "crohn", "ulcerative colitis", "gerd", "reflux", "pancreatitis",
    "jaundice", "gi bleed", "diarrhoea", "diarrhea", "constipation", "ibs",
    "gallbladder", "cholecyst", "nausea", "vomit",
  ],
  Neurology: [
    "neuro", "stroke", "seizure", "epilepsy", "migraine", "headache",
    "meningitis", "encephalitis", "parkinson", "multiple sclerosis",
    "neuropathy", "weakness", "numbness", "syncope", "tia", "cva",
    "guillain", "confusion", "delirium",
  ],
  Endocrinology: [
    "diabetes", "diabetic", "insulin", "thyroid", "hypothyroid", "hyperthyroid",
    "adrenal", "cortisol", "endocrin", "hba1c", "hypoglycaemia", "hypoglycemia",
    "hyperglycaemia", "hyperglycemia", "dka", "hhs",
  ],
  Renal: [
    "renal", "kidney", "aki", "ckd", "dialysis", "electrolyte", "hyponatraemia",
    "hyponatremia", "hyperkalaemia", "hyperkalemia", "creatinine", "egfr",
    "nephritis", "uti", "pyelonephritis", "haematuria", "hematuria",
  ],
  Haematology: [
    "anaemia", "anemia", "haematol", "hematol", "clotting", "dvt",
    "pulmonary embolism", "anticoag", "warfarin", "doac", "thrombosis",
    "platelet", "leukemia", "leukaemia", "lymphoma", "transfusion", "inr",
  ],
  Infectious: [
    "infection", "sepsis", "antibiotic", "fever", "meningococcal", "hiv",
    "hepatitis", "cellulitis", "abscess", "mrsa", "c.diff", "covid",
    "influenza", "malaria", "osteomyelitis",
  ],
  Musculoskeletal: [
    "ortho", "fracture", "joint", "arthritis", "rheumat", "back pain",
    "sciatica", "gout", "osteoporosis", "sprain", "dislocation", "msk",
    "tendon", "ligament",
  ],
  Obstetrics: [
    "pregnan", "obstetric", "antenatal", "postnatal", "labour", "labor",
    "eclampsia", "preeclampsia", "miscarriage", "ectopic", "gynae", "gynec",
    "period", "menstru", "contraception", "pid",
  ],
  Paediatrics: [
    "paediat", "pediat", "neonat", "infant", "child", "toddler", "baby",
    "fever in child", "croup", "bronchiolitis", "kawasaki",
  ],
  Psychiatry: [
    "psychiatr", "depression", "anxiety", "suicid", "self-harm", "self harm",
    "psychosis", "schizophren", "bipolar", "mental health", "sectioning",
    "overdose", "alcohol withdrawal", "delirium tremens",
  ],
  Dermatology: [
    "dermat", "rash", "eczema", "psoriasis", "skin lesion", "melanoma",
    "urticaria", "cellulitis", "wound", "ulcer",
  ],
  Ophthalmology: [
    "eye", "ophthalm", "vision", "red eye", "glaucoma", "cataract",
    "retina", "conjunctivitis", "visual loss",
  ],
  ENT: [
    "ent", "ear", "throat", "tonsil", "sinus", "epistaxis", "nosebleed",
    "otitis", "hearing", "vertigo", "swallow", "dysphagia",
  ],
  Urology: [
    "urolog", "prostate", "catheter", "retention", "testicular", "scrotal",
    "bph", "psa", "erectile",
  ],
  Emergency: [
    "trauma", "resus", "abcde", "anaphylaxis", "overdose", "poisoning",
    "burn", "major haemorrhage", "major hemorrhage", "atls", "als",
  ],
  Pharmacology: [
    "dose", "dosing", "drug interaction", "side effect", "contraindication",
    "prescrib", "bnf", "medication", "pharmacol", "toxicity",
  ],
  Guidelines: [
    "nice", "guideline", "protocol", "pathway", "bts", "esc ", "aha ",
    "sign guideline",
  ],
};

export type WeeklyTopic = { name: string; count: number };

export type WeeklySummaryData = {
  weekStart: string;
  weekEnd: string;
  isoWeekKey: string;
  alreadySeen: boolean;
  questionsAsked: number;
  learningLogged: number;
  /** Distinct calendar days this week with a question or learning log. */
  activeDays: number;
  /** Specialty breakdown from questions asked (for pie chart). */
  questionTopics: WeeklyTopic[];
  /** Highlight line e.g. most common specialty. */
  topQuestionTopic: string | null;
  /** Clinical tags from CPD logs (non-GMC). */
  loggedTopics: WeeklyTopic[];
  toolsUsed: number;
  toolsByType: WeeklyTopic[];
  encouragement: string;
};

export const mapToGmcDomain = (tag: string): string | null => {
  const t = tag.toLowerCase().trim();
  if (t.includes("knowledge") || t.includes("skills & performance") || t.includes("skills and performance")) {
    return GMC_DOMAINS[0];
  }
  if (t.includes("safety") || t.includes("quality")) return GMC_DOMAINS[1];
  if (t.includes("communication") || t.includes("partnership") || t.includes("teamwork")) {
    return GMC_DOMAINS[2];
  }
  if (t.includes("maintaining") || t.includes("trust")) return GMC_DOMAINS[3];
  return null;
};

/** Monday 00:00 ÔåÆ Sunday end-of-day, local time. */
export const getCurrentWeekRange = (now = new Date()) => {
  const local = new Date(now);
  local.setHours(0, 0, 0, 0);

  const day = local.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  const weekStart = new Date(local);
  weekStart.setDate(local.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart,
    weekEnd,
    weekStartIso: weekStart.toISOString(),
    weekEndIso: weekEnd.toISOString(),
    weekStartDate: toDateKey(weekStart),
    weekEndDate: toDateKey(weekEnd),
    isoWeekKey: getIsoWeekKey(weekStart),
  };
};

export const isWeekendSummaryWindow = (now = new Date()) => {
  const day = now.getDay();
  return day === 5 || day === 6 || day === 0;
};

export const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const toDateKeyFromIso = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toDateKey(d);
};

/** ISO week key based on the Monday of the week (e.g. 2026-W29). */
export const getIsoWeekKey = (weekMonday: Date) => {
  const thursday = new Date(weekMonday);
  thursday.setDate(weekMonday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - (jan4Day - 1));
  firstMonday.setHours(0, 0, 0, 0);

  const weekNo =
    Math.round((weekMonday.getTime() - firstMonday.getTime()) / 86400000 / 7) + 1;

  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
};

export const formatWeekLabel = (weekStartDate: string, weekEndDate: string) => {
  const start = new Date(`${weekStartDate}T12:00:00`);
  const end = new Date(`${weekEndDate}T12:00:00`);
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${startLabel} ÔÇô ${endLabel}`;
};

export const classifyQuestionSpecialty = (question: string): string => {
  const text = ` ${question.toLowerCase()} `;
  let bestSpecialty = "General";
  let bestScore = 0;

  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.includes(" ") ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSpecialty = specialty;
    }
  }

  return bestSpecialty;
};

export const classifyQuestionsIntoTopics = (
  questions: string[],
  limit = 8
): WeeklyTopic[] => {
  const counts: Record<string, number> = {};

  for (const q of questions) {
    if (!q?.trim()) continue;
    const specialty = classifyQuestionSpecialty(q);
    counts[specialty] = (counts[specialty] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const extractClinicalTopics = (
  entries: { tags?: unknown }[],
  limit = 5
): WeeklyTopic[] => {
  const tagCounts: Record<string, number> = {};

  for (const entry of entries) {
    const tags = normalizeTags(entry.tags);
    for (const tag of tags) {
      if (mapToGmcDomain(tag)) continue;
      const clean = tag.trim();
      if (!clean) continue;
      tagCounts[clean] = (tagCounts[clean] || 0) + 1;
    }
  }

  return Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const normalizeTags = (tags: unknown): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
};

export const getEncouragementMessage = (
  learningLogged: number,
  questionsAsked: number,
  activeDays: number,
  topQuestionTopic: string | null
) => {
  if (learningLogged === 0 && questionsAsked > 0) {
    const topicHint = topQuestionTopic && topQuestionTopic !== "General"
      ? ` Your ${topQuestionTopic.toLowerCase()} questions would make great reflections.`
      : "";
    return `You've been curious this week ÔÇö capturing even one reflection turns questions into appraisal-ready learning.${topicHint}`;
  }
  if (learningLogged === 0) {
    return "A quiet week so far. Ask a clinical question or log a short reflection to get your learning log moving.";
  }
  if (activeDays >= 4 || learningLogged >= 3) {
    return "Solid week of learning ÔÇö your portfolio is growing. Keep the momentum into next week.";
  }
  if (learningLogged >= 1) {
    return "Nice consistency ÔÇö another log or two this weekend keeps your streak strong.";
  }
  return "You're building a habit. Aim for a couple of learning logs each week to stay ahead of appraisal.";
};

export const hasWeeklyActivity = (summary: Pick<
  WeeklySummaryData,
  "questionsAsked" | "learningLogged" | "toolsUsed"
>) =>
  summary.questionsAsked + summary.learningLogged + summary.toolsUsed > 0;

/** Soft clinical palette for pie slices (teal / slate / warm accents ÔÇö not purple). */
export const WEEKLY_TOPIC_COLORS = [
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#64748b",
  "#ca8a04",
  "#ea580c",
  "#059669",
  "#475569",
];
