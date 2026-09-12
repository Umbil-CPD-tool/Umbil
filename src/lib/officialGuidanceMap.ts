import {
  MAX_OFFICIAL_GUIDANCE,
  isTrustedOfficialUrl,
  type OfficialGuidanceLink,
} from "@/lib/officialGuidance";

export type CuratedGuidanceEntry = {
  id: string;
  /** Higher wins when several topics match. */
  priority?: number;
  aliases: string[];
  /** NICE codes like ng91 — matching these in the question boosts this entry. */
  niceCodes?: string[];
  links: OfficialGuidanceLink[];
};

const cks = (slug: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://cks.nice.org.uk/topics/${slug}/`,
  publisher: "NICE CKS",
});

const nice = (code: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.nice.org.uk/guidance/${code.toLowerCase()}`,
  publisher: "NICE",
});

const bnf = (slug: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://bnf.nice.org.uk/drugs/${slug}/`,
  publisher: "BNF",
});

const nhs = (path: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.nhs.uk/${path.replace(/^\//, "")}`,
  publisher: "NHS",
});

const sign = (slug: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.sign.ac.uk/our-guidelines/${slug}/`,
  publisher: "SIGN",
});

const bmjBp = (slug: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://bestpractice.bmj.com/topics/en-gb/${slug}`,
  publisher: "BMJ Best Practice",
});

const pcds = (slug: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.pcds.org.uk/clinical-guidance/${slug}`,
  publisher: "PCDS",
});

const dermnet = (slug: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://dermnetnz.org/topics/${slug}`,
  publisher: "DermNet",
});

const fsrh = (path: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.fsrh.org/${path.replace(/^\//, "")}`,
  publisher: "FSRH",
});

const rcog = (path: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.rcog.org.uk/${path.replace(/^\//, "")}`,
  publisher: "RCOG",
});

const bashh = (path: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.bashhguidelines.org/${path.replace(/^\//, "")}`,
  publisher: "BASHH",
});

const gov = (path: string, title: string): OfficialGuidanceLink => ({
  title,
  url: `https://www.gov.uk/${path.replace(/^\//, "")}`,
  publisher: "UKHSA / GOV.UK",
});

const EXTRA_DRUG_ENTRIES: CuratedGuidanceEntry[] = (
  [
    ["salbutamol", "Salbutamol", "ventolin"],
    ["atorvastatin", "Atorvastatin"],
    ["simvastatin", "Simvastatin"],
    ["lansoprazole", "Lansoprazole"],
    ["citalopram", "Citalopram"],
    ["fluoxetine", "Fluoxetine"],
    ["mirtazapine", "Mirtazapine"],
    ["venlafaxine", "Venlafaxine"],
    ["gabapentin", "Gabapentin"],
    ["pregabalin", "Pregabalin"],
    ["naproxen", "Naproxen"],
    ["levothyroxine-sodium", "Levothyroxine sodium", "levothyroxine"],
    ["furosemide", "Furosemide"],
    ["clopidogrel", "Clopidogrel"],
    ["flucloxacillin", "Flucloxacillin"],
    ["phenoxymethylpenicillin", "Phenoxymethylpenicillin", "penicillin v"],
    ["metronidazole", "Metronidazole"],
    ["azithromycin", "Azithromycin"],
    ["ciprofloxacin", "Ciprofloxacin"],
    ["cetirizine-hydrochloride", "Cetirizine hydrochloride", "cetirizine"],
    ["loratadine", "Loratadine"],
    ["montelukast", "Montelukast"],
    ["empagliflozin", "Empagliflozin"],
    ["dapagliflozin", "Dapagliflozin"],
    ["sitagliptin", "Sitagliptin"],
    ["gliclazide", "Gliclazide"],
    ["tamsulosin-hydrochloride", "Tamsulosin hydrochloride", "tamsulosin"],
    ["sildenafil", "Sildenafil"],
    ["tadalafil", "Tadalafil"],
    ["colecalciferol", "Colecalciferol"],
    ["alendronic-acid", "Alendronic acid", "alendronate"],
    ["lamotrigine", "Lamotrigine"],
    ["levetiracetam", "Levetiracetam"],
    ["carbamazepine", "Carbamazepine"],
    ["quetiapine", "Quetiapine"],
    ["olanzapine", "Olanzapine"],
    ["aripiprazole", "Aripiprazole"],
    ["risperidone", "Risperidone"],
    ["zopiclone", "Zopiclone"],
    ["codeine-phosphate", "Codeine phosphate", "codeine"],
    ["losartan-potassium", "Losartan potassium", "losartan"],
    ["candesartan-cilexetil", "Candesartan cilexetil", "candesartan"],
    ["indapamide", "Indapamide"],
    ["spironolactone", "Spironolactone"],
    ["ezetimibe", "Ezetimibe"],
    ["famotidine", "Famotidine"],
    ["mesalazine", "Mesalazine"],
    ["azathioprine", "Azathioprine"],
    ["hydroxychloroquine-sulfate", "Hydroxychloroquine sulfate", "hydroxychloroquine"],
    ["colchicine", "Colchicine"],
    ["donepezil-hydrochloride", "Donepezil hydrochloride", "donepezil"],
    ["finasteride", "Finasteride"],
    ["norethisterone", "Norethisterone"],
    ["isosorbide-mononitrate", "Isosorbide mononitrate"],
    ["glyceryl-trinitrate", "Glyceryl trinitrate", "gtn"],
    ["digoxin", "Digoxin"],
    ["amiodarone-hydrochloride", "Amiodarone hydrochloride", "amiodarone"],
    ["diltiazem-hydrochloride", "Diltiazem hydrochloride", "diltiazem"],
    ["verapamil-hydrochloride", "Verapamil hydrochloride", "verapamil"],
    ["carbimazole", "Carbimazole"],
    ["fluconazole", "Fluconazole"],
    ["clotrimazole", "Clotrimazole"],
    ["beclometasone-dipropionate", "Beclometasone dipropionate", "beclometasone"],
    ["budesonide", "Budesonide"],
    ["tiotropium", "Tiotropium"],
  ] as Array<[string, string, ...string[]]>
).map(([slug, title, ...aliases]) => ({
  id: `drug-${slug}`,
  priority: 5,
  aliases: [title.toLowerCase(), ...aliases],
  links: [bnf(slug, title)],
}));

/**
 * Curated topic / drug → official URL map.
 * Prefer showing nothing over a wrong link.
 * Extra topics can also be added live in Supabase `official_guidance_entries`.
 */
export const CURATED_GUIDANCE_ENTRIES: CuratedGuidanceEntry[] = [
  // —— Acute / triage presentations ——
  {
    id: "headache",
    priority: 10,
    aliases: [
      "headache assessment",
      "tension headache",
      "migraine",
      "headache",
      "head pain",
      "cephalgia",
    ],
    links: [
      cks("headache-assessment", "Headache - assessment"),
      cks("migraine", "Migraine"),
      nice("cg150", "Headaches in over 12s (CG150)"),
      nhs("conditions/headaches/", "Headaches"),
    ],
  },
  {
    id: "chest-pain",
    priority: 12,
    aliases: [
      "chest pain",
      "chest discomfort",
      "chest tightness",
      "central chest",
      "acute coronary",
      "heart attack",
      "acs",
      "nstemi",
      "stemi",
      "angina",
    ],
    links: [
      cks("chest-pain", "Chest pain"),
      cks("angina", "Angina"),
      nice("ng185", "Acute coronary syndromes (NG185)"),
      nhs("conditions/chest-pain/", "Chest pain"),
      nhs("conditions/heart-attack/", "Heart attack"),
    ],
  },
  {
    id: "breathlessness",
    priority: 10,
    aliases: [
      "shortness of breath",
      "short of breath",
      "difficulty breathing",
      "breathlessness",
      "breathless",
      "dyspnoea",
      "dyspnea",
    ],
    links: [
      cks("breathlessness", "Breathlessness"),
      nhs("conditions/shortness-of-breath/", "Shortness of breath"),
    ],
  },
  {
    id: "cough",
    priority: 8,
    aliases: ["chronic cough", "persistent cough", "coughing", "cough"],
    links: [
      cks("cough", "Cough"),
      nhs("conditions/cough/", "Cough"),
    ],
  },
  {
    id: "head-injury",
    priority: 12,
    aliases: [
      "head injury",
      "hit head",
      "bumped head",
      "concussion",
      "fell and hit",
    ],
    links: [
      cks("head-injury", "Head injury"),
      nice("ng232", "Head injury (NG232)"),
      nhs("conditions/head-injury-and-concussion/", "Head injury and concussion"),
    ],
  },
  {
    id: "dvt",
    priority: 12,
    aliases: [
      "deep vein thrombosis",
      "deep vein",
      "leg swelling",
      "calf swelling",
      "swollen calf",
      "swollen leg",
      "calf pain",
      "dvt",
    ],
    links: [
      cks("deep-vein-thrombosis", "Deep vein thrombosis"),
      nice("ng158", "Venous thromboembolic diseases (NG158)"),
      nhs("conditions/deep-vein-thrombosis-dvt/", "Deep vein thrombosis (DVT)"),
    ],
  },
  {
    id: "pe",
    priority: 12,
    aliases: ["pulmonary embolism", "pulmonary embolus"],
    links: [
      cks("pulmonary-embolism", "Pulmonary embolism"),
      nice("ng158", "Venous thromboembolic diseases (NG158)"),
      nhs("conditions/pulmonary-embolism/", "Pulmonary embolism"),
    ],
  },
  {
    id: "palpitations",
    priority: 10,
    aliases: [
      "palpitations",
      "heart racing",
      "heart flutter",
      "irregular heartbeat",
      "skipped beat",
      "tachycardia",
    ],
    links: [
      cks("palpitations", "Palpitations"),
      nhs("conditions/heart-palpitations/", "Heart palpitations"),
    ],
  },
  {
    id: "af",
    priority: 11,
    aliases: ["atrial fibrillation", "afib", "a-fib", "af"],
    niceCodes: ["ng196"],
    links: [
      cks("atrial-fibrillation", "Atrial fibrillation"),
      nice("ng196", "Atrial fibrillation (NG196)"),
      bmjBp("atrial-fibrillation", "Atrial fibrillation"),
      nhs("conditions/atrial-fibrillation/", "Atrial fibrillation"),
    ],
  },
  {
    id: "vertigo",
    priority: 9,
    aliases: [
      "vertigo",
      "dizziness",
      "dizzy",
      "lightheaded",
      "light headed",
      "spinning",
      "labyrinthitis",
      "bppv",
    ],
    links: [
      cks("vertigo", "Vertigo"),
      cks("blackouts-syncope", "Blackouts and syncope"),
      nhs("conditions/vertigo/", "Vertigo"),
      nhs("conditions/fainting/", "Fainting"),
    ],
  },
  {
    id: "stroke-tia",
    priority: 14,
    aliases: [
      "transient ischaemic attack",
      "transient ischemic attack",
      "facial droop",
      "slurred speech",
      "stroke",
      "tia",
      "cva",
    ],
    links: [
      nice("ng128", "Stroke and transient ischaemic attack (NG128)"),
      nhs("conditions/stroke/", "Stroke"),
      nhs("conditions/transient-ischaemic-attack-tia/", "Transient ischaemic attack (TIA)"),
    ],
  },
  {
    id: "abdominal-pain",
    priority: 9,
    aliases: [
      "abdominal pain",
      "abdo pain",
      "abdomen pain",
      "stomach pain",
      "tummy pain",
      "belly pain",
      "epigastric",
      "appendicitis",
    ],
    links: [
      cks("abdominal-pain-acute", "Abdominal pain - acute"),
      nhs("conditions/stomach-ache/", "Stomach ache"),
    ],
  },
  {
    id: "back-pain",
    priority: 9,
    aliases: [
      "low back pain",
      "lower back",
      "back pain",
      "lumbago",
      "sciatica",
      "cauda equina",
    ],
    links: [
      cks("back-pain-low-without-radiculopathy", "Back pain - low (without radiculopathy)"),
      cks("sciatica", "Sciatica (lumbar radiculopathy)"),
      nice("ng59", "Low back pain and sciatica (NG59)"),
      nhs("conditions/back-pain/", "Back pain"),
      nhs("conditions/sciatica/", "Sciatica"),
    ],
  },
  {
    id: "rectal-bleeding",
    priority: 11,
    aliases: [
      "rectal bleeding",
      "blood in stool",
      "blood in poo",
      "pr bleeding",
      "fresh blood pr",
      "bleeding from the bottom",
      "melaena",
      "melena",
    ],
    links: [
      cks(
        "gastrointestinal-tract-lower-cancers-recognition-referral",
        "GI tract (lower) cancers - recognition and referral"
      ),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/piles-haemorrhoids/", "Piles (haemorrhoids)"),
    ],
  },
  {
    id: "change-bowel-habit",
    priority: 10,
    aliases: [
      "change in bowel",
      "altered bowel",
      "bowel habit",
      "constipation",
    ],
    links: [
      cks("constipation", "Constipation"),
      cks(
        "gastrointestinal-tract-lower-cancers-recognition-referral",
        "GI tract (lower) cancers - recognition and referral"
      ),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/constipation/", "Constipation"),
    ],
  },
  {
    id: "dysphagia",
    priority: 12,
    aliases: [
      "difficulty swallowing",
      "trouble swallowing",
      "food sticking",
      "swallowing problem",
      "dysphagia",
    ],
    links: [
      cks(
        "gastrointestinal-tract-upper-cancers-recognition-referral",
        "GI tract (upper) cancers - recognition and referral"
      ),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
    ],
  },
  {
    id: "chronic-pain",
    priority: 7,
    aliases: ["chronic pain", "persistent pain", "ongoing pain", "pain not going away"],
    links: [
      cks("chronic-pain", "Chronic pain"),
      nice("ng193", "Chronic pain (primary and secondary) (NG193)"),
    ],
  },
  {
    id: "gastroenteritis",
    priority: 9,
    aliases: [
      "gastroenteritis",
      "food poisoning",
      "throwing up",
      "vomiting",
      "gastro",
    ],
    links: [
      cks("gastroenteritis", "Gastroenteritis"),
      nhs("conditions/gastroenteritis/", "Gastroenteritis"),
    ],
  },
  {
    id: "diarrhoea",
    priority: 8,
    aliases: [
      "diarrhoea",
      "diarrhea",
      "loose stool",
      "runny stool",
      "watery stool",
    ],
    links: [
      cks("diarrhoea-adults-assessment", "Diarrhoea - adult's assessment"),
      nhs("conditions/diarrhoea/", "Diarrhoea"),
    ],
  },
  {
    id: "fever-adult",
    priority: 8,
    aliases: ["adult fever", "fever in adult", "fever in adults", "pyrexia in adult"],
    niceCodes: ["ng51"],
    links: [
      nice("ng51", "Sepsis: recognition, diagnosis and early management (NG51)"),
      cks("sepsis", "Sepsis"),
      nhs("conditions/sepsis/", "Sepsis"),
    ],
  },
  {
    id: "fever-child",
    priority: 11,
    aliases: [
      "fever in under 5",
      "fever under 5",
      "fever in children",
      "fever in a child",
      "child with fever",
      "child fever",
      "baby fever",
      "toddler fever",
      "paediatric fever",
      "pediatric fever",
      "feverish child",
      "unwell child",
      "sick child",
      "my child",
      "my baby",
      "my toddler",
    ],
    links: [
      nice("ng143", "Fever in under 5s (NG143)"),
      nice("ng51", "Sepsis: recognition, diagnosis and early management (NG51)"),
      nhs("conditions/fever-in-children/", "Fever in children"),
    ],
  },
  {
    id: "ear-pain",
    priority: 10,
    aliases: [
      "otitis media",
      "otitis externa",
      "ear infection",
      "earache",
      "ear ache",
      "ear pain",
      "otalgia",
    ],
    niceCodes: ["ng91"],
    links: [
      cks("otitis-media-acute", "Otitis media - acute"),
      cks("otitis-externa", "Otitis externa"),
      nice("ng91", "Otitis media (acute): antimicrobial prescribing (NG91)"),
      nhs("conditions/ear-infections/", "Ear infections"),
    ],
  },
  {
    id: "uti",
    priority: 11,
    aliases: [
      "urinary tract infection",
      "urine infection",
      "urinary infection",
      "burning urine",
      "cystitis",
      "dysuria",
      "waterworks",
      "uti",
    ],
    niceCodes: ["ng109"],
    links: [
      cks("urinary-tract-infection-lower-women", "UTI (lower) - women"),
      cks("urinary-tract-infection-lower-men", "UTI (lower) - men"),
      cks("pyelonephritis-acute", "Pyelonephritis - acute"),
      nice("ng109", "UTI (lower): antimicrobial prescribing (NG109)"),
      bmjBp("urinary-tract-infections", "Urinary tract infections"),
      nhs("conditions/urinary-tract-infections-utis/", "Urinary tract infections (UTIs)"),
      nhs("conditions/cystitis/", "Cystitis"),
    ],
  },
  {
    id: "rash-meningism",
    priority: 13,
    aliases: [
      "non-blanching rash",
      "non blanching",
      "meningococcal",
      "meningitis",
      "purpuric rash",
    ],
    links: [
      nice("ng51", "Sepsis: recognition, diagnosis and early management (NG51)"),
      nhs("conditions/meningitis/", "Meningitis"),
      nhs("conditions/sepsis/", "Sepsis"),
    ],
  },
  {
    id: "sore-throat",
    priority: 10,
    aliases: [
      "sore throat",
      "throat pain",
      "tonsillitis",
      "pharyngitis",
      "strep throat",
      "scarlet fever",
    ],
    links: [
      cks("sore-throat-acute", "Sore throat - acute"),
      nice("ng84", "Sore throat (acute): antimicrobial prescribing (NG84)"),
      nhs("conditions/sore-throat/", "Sore throat"),
      nhs("conditions/tonsillitis/", "Tonsillitis"),
    ],
  },
  {
    id: "pregnancy",
    priority: 12,
    aliases: [
      "ectopic pregnancy",
      "reduced movements",
      "baby not moving",
      "bleeding in pregnancy",
      "weeks pregnant",
      "weeks gestation",
      "antenatal",
      "miscarriage",
      "pregnant",
      "pregnancy",
      "pre-eclampsia",
      "preeclampsia",
    ],
    niceCodes: ["ng201", "ng126"],
    links: [
      nice("ng201", "Antenatal care (NG201)"),
      nice("ng126", "Ectopic pregnancy and miscarriage (NG126)"),
      cks("miscarriage", "Miscarriage"),
      cks("ectopic-pregnancy", "Ectopic pregnancy"),
      cks("hypertension-in-pregnancy", "Hypertension in pregnancy"),
      rcog("guidance/browse-all-guidance/green-top-guidelines/", "RCOG Green-top Guidelines"),
      nhs("conditions/miscarriage/", "Miscarriage"),
      nhs("conditions/ectopic-pregnancy/", "Ectopic pregnancy"),
      nhs("conditions/pre-eclampsia/", "Pre-eclampsia"),
    ],
  },
  {
    id: "lymphadenopathy",
    priority: 9,
    aliases: [
      "lymph node",
      "swollen gland",
      "swollen glands",
      "lymphadenopathy",
      "neck lump",
      "swollen nodes",
    ],
    links: [
      cks("neck-lump", "Neck lump"),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/swollen-glands/", "Swollen glands"),
    ],
  },
  {
    id: "weight-loss",
    priority: 10,
    aliases: [
      "unintentional weight loss",
      "unintentional weight",
      "losing weight unintentionally",
      "lost weight unintentionally",
    ],
    links: [
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/unintentional-weight-loss/", "Unintentional weight loss"),
    ],
  },
  {
    id: "haematuria",
    priority: 12,
    aliases: [
      "haematuria",
      "hematuria",
      "blood in urine",
      "bloody urine",
      "pink urine",
      "red urine",
    ],
    links: [
      cks("urological-cancers-recognition-referral", "Urological cancers - recognition and referral"),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/blood-in-urine/", "Blood in urine"),
    ],
  },
  {
    id: "breast-lump",
    priority: 12,
    aliases: ["breast lump", "breast mass", "lump in breast", "breast swelling"],
    links: [
      cks("breast-cancer-recognition-referral", "Breast cancer - recognition and referral"),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/breast-lump/", "Breast lump"),
      nhs("conditions/breast-cancer/", "Breast cancer"),
    ],
  },
  {
    id: "pmb",
    priority: 12,
    aliases: [
      "postmenopausal bleeding",
      "post menopausal bleeding",
      "bleeding after menopause",
      "pmb",
    ],
    links: [
      cks(
        "gynaecological-cancers-recognition-referral",
        "Gynaecological cancers - recognition and referral"
      ),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
    ],
  },
  {
    id: "testicular-lump",
    priority: 12,
    aliases: [
      "testicular lump",
      "testicle lump",
      "lump in testicle",
      "scrotal lump",
      "swollen testicle",
      "testicular cancer",
    ],
    links: [
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/testicle-lumps-and-swellings/", "Testicle lumps and swellings"),
    ],
  },
  {
    id: "fatigue",
    priority: 7,
    aliases: [
      "tired all the time",
      "tiredness",
      "fatigue",
      "exhausted",
      "low energy",
      "lethargy",
    ],
    links: [
      cks("tiredness-fatigue-in-adults", "Tiredness/fatigue in adults"),
      nhs("conditions/tiredness-and-fatigue/", "Tiredness and fatigue"),
    ],
  },
  {
    id: "depression",
    priority: 10,
    aliases: [
      "low mood",
      "depression",
      "suicidal",
      "self-harm",
      "self harm",
      "feeling hopeless",
      "mental health crisis",
    ],
    niceCodes: ["ng222"],
    links: [
      cks("depression", "Depression"),
      nice("ng222", "Depression in adults (NG222)"),
      bmjBp("depression-in-adults", "Depression in adults"),
      nhs("conditions/depression/", "Depression"),
    ],
  },
  {
    id: "anxiety",
    priority: 9,
    aliases: [
      "generalised anxiety",
      "generalized anxiety",
      "panic attack",
      "anxiety crisis",
      "anxiety",
      "gad",
    ],
    links: [
      nhs("mental-health/conditions/generalised-anxiety-disorder-gad/", "Generalised anxiety disorder (GAD)"),
      nhs("conditions/generalised-anxiety-disorder/", "Generalised anxiety disorder"),
    ],
  },

  // —— Common long-term conditions ——
  {
    id: "hypertension",
    priority: 10,
    aliases: ["high blood pressure", "hypertension", "blood pressure"],
    niceCodes: ["ng136"],
    links: [
      cks("hypertension", "Hypertension"),
      nice("ng136", "Hypertension in adults (NG136)"),
      bmjBp("hypertension", "Hypertension"),
      nhs("conditions/high-blood-pressure-hypertension/", "High blood pressure (hypertension)"),
    ],
  },
  {
    id: "asthma",
    priority: 10,
    aliases: ["asthma"],
    niceCodes: ["ng80"],
    links: [
      cks("asthma", "Asthma"),
      nice("ng80", "Asthma: diagnosis, monitoring and chronic asthma management (NG80)"),
      sign("british-guideline-on-the-management-of-asthma", "BTS/SIGN asthma guideline"),
      bmjBp("asthma", "Asthma"),
      nhs("conditions/asthma/", "Asthma"),
    ],
  },
  {
    id: "copd",
    priority: 10,
    aliases: ["chronic obstructive", "copd", "emphysema"],
    links: [
      cks("chronic-obstructive-pulmonary-disease", "Chronic obstructive pulmonary disease"),
      nhs("conditions/chronic-obstructive-pulmonary-disease-copd/", "COPD"),
    ],
  },
  {
    id: "diabetes-t2",
    priority: 10,
    aliases: ["type 2 diabetes", "type ii diabetes", "t2dm", "diabetes"],
    niceCodes: ["ng28"],
    links: [
      cks("diabetes-type-2", "Diabetes - type 2"),
      nice("ng28", "Type 2 diabetes in adults (NG28)"),
      bmjBp("type-2-diabetes", "Type 2 diabetes"),
      nhs("conditions/type-2-diabetes/", "Type 2 diabetes"),
    ],
  },
  {
    id: "diabetes-t1",
    priority: 11,
    aliases: ["type 1 diabetes", "type i diabetes", "t1dm", "dka"],
    links: [cks("diabetes-type-1", "Diabetes - type 1")],
  },
  {
    id: "heart-failure",
    priority: 10,
    aliases: ["heart failure", "lvef", "chf"],
    links: [cks("heart-failure-chronic", "Heart failure - chronic")],
  },
  {
    id: "ckd",
    priority: 9,
    aliases: ["chronic kidney disease", "ckd", "renal impairment", "aki"],
    links: [cks("chronic-kidney-disease", "Chronic kidney disease")],
  },
  {
    id: "anaemia",
    priority: 9,
    aliases: ["iron deficiency", "iron-deficiency", "microcytic", "anaemia", "anemia"],
    links: [
      cks("anaemia-iron-deficiency", "Anaemia - iron deficiency"),
      nhs("conditions/iron-deficiency-anaemia/", "Iron deficiency anaemia"),
    ],
  },
  {
    id: "thyroid",
    priority: 9,
    aliases: ["hypothyroidism", "hyperthyroidism", "underactive thyroid", "overactive thyroid", "thyroid"],
    links: [
      cks("hypothyroidism", "Hypothyroidism"),
      cks("hyperthyroidism", "Hyperthyroidism"),
      nhs("conditions/underactive-thyroid-hypothyroidism/", "Underactive thyroid (hypothyroidism)"),
      nhs("conditions/overactive-thyroid-hyperthyroidism/", "Overactive thyroid (hyperthyroidism)"),
    ],
  },
  {
    id: "epilepsy",
    priority: 9,
    aliases: ["epilepsy", "seizure", "seizures"],
    links: [
      cks("epilepsy", "Epilepsy"),
      nhs("conditions/epilepsy/", "Epilepsy"),
    ],
  },
  {
    id: "gout",
    priority: 9,
    aliases: ["gout", "gouty"],
    links: [
      cks("gout", "Gout"),
      nhs("conditions/gout/", "Gout"),
    ],
  },
  {
    id: "oa",
    priority: 8,
    aliases: ["osteoarthritis"],
    links: [
      cks("osteoarthritis", "Osteoarthritis"),
      nhs("conditions/osteoarthritis/", "Osteoarthritis"),
    ],
  },
  {
    id: "ra",
    priority: 9,
    aliases: ["rheumatoid arthritis", "rheumatoid"],
    links: [
      cks("rheumatoid-arthritis", "Rheumatoid arthritis"),
      nhs("conditions/rheumatoid-arthritis/", "Rheumatoid arthritis"),
    ],
  },
  {
    id: "osteoporosis",
    priority: 8,
    aliases: ["osteoporosis", "fragility fracture", "bone density"],
    links: [
      cks("osteoporosis-prevention-of-fragility-fractures", "Osteoporosis - prevention of fragility fractures"),
      nhs("conditions/osteoporosis/", "Osteoporosis"),
    ],
  },
  {
    id: "shoulder",
    priority: 7,
    aliases: ["shoulder pain", "rotator cuff", "frozen shoulder"],
    links: [
      cks("shoulder-pain", "Shoulder pain"),
      nhs("conditions/shoulder-pain/", "Shoulder pain"),
    ],
  },
  {
    id: "knee",
    priority: 7,
    aliases: ["knee pain", "knee oa"],
    links: [
      cks("knee-pain-assessment", "Knee pain - assessment"),
      nhs("conditions/knee-pain/", "Knee pain"),
    ],
  },
  {
    id: "neck-pain",
    priority: 7,
    aliases: ["neck pain", "cervicalgia"],
    links: [
      cks("neck-pain-non-specific", "Neck pain - non-specific"),
      nhs("conditions/neck-pain/", "Neck pain"),
    ],
  },
  {
    id: "eczema",
    priority: 8,
    aliases: ["atopic eczema", "atopic dermatitis", "eczema", "emollient"],
    links: [
      cks("eczema-atopic", "Eczema - atopic"),
      pcds("atopic-eczema", "Atopic eczema"),
      dermnet("atopic-eczema", "Atopic eczema"),
      nhs("conditions/atopic-eczema/", "Atopic eczema"),
    ],
  },
  {
    id: "acne",
    priority: 8,
    aliases: ["acne vulgaris", "acne"],
    links: [
      cks("acne-vulgaris", "Acne vulgaris"),
      pcds("acne-vulgaris", "Acne vulgaris"),
      dermnet("acne", "Acne"),
      nhs("conditions/acne/", "Acne"),
    ],
  },
  {
    id: "psoriasis",
    priority: 8,
    aliases: ["psoriasis"],
    links: [
      cks("psoriasis", "Psoriasis"),
      pcds("psoriasis-an-overview", "Psoriasis"),
      dermnet("psoriasis", "Psoriasis"),
    ],
  },
  {
    id: "menopause",
    priority: 9,
    aliases: ["perimenopause", "menopause", "hrt"],
    links: [
      cks("menopause", "Menopause"),
      nhs("conditions/menopause/", "Menopause"),
    ],
  },
  {
    id: "hay-fever",
    priority: 8,
    aliases: ["allergic rhinitis", "hay fever", "hayfever"],
    links: [
      cks("allergic-rhinitis", "Allergic rhinitis"),
      nhs("conditions/hay-fever/", "Hay fever"),
    ],
  },
  {
    id: "smoking",
    priority: 8,
    aliases: ["smoking cessation", "quit smoking", "stop smoking", "varenicline", "nrt"],
    links: [
      cks("smoking-cessation", "Smoking cessation"),
      bnf("varenicline", "Varenicline"),
    ],
  },
  {
    id: "obesity",
    priority: 8,
    aliases: ["obesity", "weight management", "bmi"],
    links: [
      cks("obesity", "Obesity"),
      nhs("conditions/obesity/", "Obesity"),
    ],
  },
  {
    id: "insomnia",
    priority: 8,
    aliases: ["insomnia", "sleep problem", "can't sleep", "cannot sleep", "poor sleep"],
    links: [cks("insomnia", "Insomnia")],
  },
  {
    id: "reflux",
    priority: 8,
    aliases: ["gord", "gerd", "acid reflux", "heartburn", "dyspepsia", "reflux"],
    links: [
      cks("dyspepsia-proven-gord", "Dyspepsia - proven GORD"),
      nhs("conditions/heartburn-and-acid-reflux/", "Heartburn and acid reflux"),
    ],
  },
  {
    id: "ibs",
    priority: 8,
    aliases: ["irritable bowel", "ibs"],
    links: [
      cks("irritable-bowel-syndrome", "Irritable bowel syndrome"),
      nhs("conditions/irritable-bowel-syndrome-ibs/", "Irritable bowel syndrome (IBS)"),
    ],
  },
  {
    id: "cellulitis",
    priority: 9,
    aliases: ["cellulitis"],
    links: [
      cks("cellulitis-acute", "Cellulitis - acute"),
      pcds("cellulitis", "Cellulitis"),
      dermnet("cellulitis", "Cellulitis"),
      nhs("conditions/cellulitis/", "Cellulitis"),
    ],
  },
  {
    id: "shingles",
    priority: 9,
    aliases: ["shingles", "herpes zoster", "zoster"],
    links: [
      cks("shingles", "Shingles"),
      pcds("herpes-zoster-shingles", "Herpes zoster (shingles)"),
      dermnet("herpes-zoster", "Herpes zoster"),
      nhs("conditions/shingles/", "Shingles"),
      bnf("aciclovir", "Aciclovir"),
    ],
  },
  {
    id: "impetigo",
    priority: 8,
    aliases: ["impetigo"],
    links: [
      cks("impetigo", "Impetigo"),
      pcds("impetigo", "Impetigo"),
      dermnet("impetigo", "Impetigo"),
      nhs("conditions/impetigo/", "Impetigo"),
    ],
  },
  {
    id: "sinusitis",
    priority: 8,
    aliases: ["sinusitis", "sinus infection"],
    links: [
      cks("sinusitis", "Sinusitis"),
      nhs("conditions/sinusitis-sinus-infection/", "Sinusitis (sinus infection)"),
    ],
  },
  {
    id: "chest-infection",
    priority: 9,
    aliases: [
      "chest infection",
      "community acquired pneumonia",
      "community-acquired pneumonia",
      "pneumonia",
      "lrti",
    ],
    links: [
      cks("chest-infections-adult", "Chest infections - adult"),
      nhs("conditions/pneumonia/", "Pneumonia"),
    ],
  },
  {
    id: "croup",
    priority: 9,
    aliases: ["croup", "barking cough"],
    links: [
      cks("croup", "Croup"),
      nhs("conditions/croup/", "Croup"),
    ],
  },
  {
    id: "bronchiolitis",
    priority: 10,
    aliases: ["bronchiolitis"],
    links: [
      nice("ng9", "Bronchiolitis in children (NG9)"),
      cks("cough-acute-with-chest-signs-in-children", "Cough - acute with chest signs in children"),
      nhs("conditions/bronchiolitis/", "Bronchiolitis"),
    ],
  },
  {
    id: "sepsis",
    priority: 14,
    aliases: ["sepsis", "septic", "urosepsis"],
    links: [
      cks("sepsis", "Sepsis"),
      nice("ng51", "Sepsis: recognition, diagnosis and early management (NG51)"),
      nhs("conditions/sepsis/", "Sepsis"),
    ],
  },
  {
    id: "bph",
    priority: 8,
    aliases: ["benign prostatic", "prostate enlargement", "luts", "bph"],
    links: [
      cks("luts-in-men", "LUTS in men"),
      cks("prostate-cancer", "Prostate cancer"),
      nhs("conditions/prostate-enlargement/", "Prostate enlargement"),
    ],
  },
  {
    id: "ed",
    priority: 8,
    aliases: ["erectile dysfunction", "impotence"],
    links: [
      cks("erectile-dysfunction", "Erectile dysfunction"),
      nhs("conditions/erectile-dysfunction/", "Erectile dysfunction"),
    ],
  },
  {
    id: "pcos",
    priority: 8,
    aliases: ["polycystic ovary", "pcos"],
    links: [
      cks("polycystic-ovary-syndrome", "Polycystic ovary syndrome"),
      nhs("conditions/polycystic-ovary-syndrome-pcos/", "Polycystic ovary syndrome (PCOS)"),
    ],
  },
  {
    id: "endometriosis",
    priority: 8,
    aliases: ["endometriosis"],
    links: [
      cks("endometriosis", "Endometriosis"),
      nhs("conditions/endometriosis/", "Endometriosis"),
    ],
  },
  {
    id: "contraception",
    priority: 8,
    aliases: [
      "combined oral contraceptive",
      "progestogen-only",
      "progestogen only",
      "contraception",
      "cocp",
      "progesterone-only pill",
      "progesterone only pill",
      "mirena",
      "intrauterine system",
    ],
    links: [
      cks("contraception-combined-hormonal-methods", "Contraception - combined hormonal methods"),
      cks("contraception-progestogen-only-methods", "Contraception - progestogen-only methods"),
      fsrh("standards-and-guidance/documents/combined-hormonal-contraception/", "Combined hormonal contraception"),
      bnf("desogestrel", "Desogestrel"),
      bnf("levonorgestrel", "Levonorgestrel"),
    ],
  },
  {
    id: "sti",
    priority: 9,
    aliases: [
      "bacterial vaginosis",
      "genital herpes",
      "chlamydia",
      "thrush",
      "candida",
    ],
    links: [
      cks("chlamydia-uncomplicated-genital", "Chlamydia - uncomplicated genital"),
      cks("herpes-simplex-genital", "Herpes simplex - genital"),
      cks("bacterial-vaginosis", "Bacterial vaginosis"),
      cks("candida-female-genital", "Candida - female genital"),
      bashh("current-guidelines/genital-infections/", "BASHH genital infection guidelines"),
      nhs("conditions/chlamydia/", "Chlamydia"),
      nhs("conditions/genital-herpes/", "Genital herpes"),
      nhs("conditions/bacterial-vaginosis/", "Bacterial vaginosis"),
      nhs("conditions/thrush-in-men-and-women/", "Thrush"),
    ],
  },
  {
    id: "dementia",
    priority: 8,
    aliases: ["dementia", "alzheimer", "cognitive decline"],
    links: [
      cks("dementia", "Dementia"),
      nhs("conditions/dementia/", "Dementia"),
    ],
  },
  {
    id: "delirium",
    priority: 9,
    aliases: ["delirium", "acute confusion"],
    links: [
      cks("delirium", "Delirium"),
      nhs("conditions/confusion/", "Confusion"),
    ],
  },
  {
    id: "parkinsons",
    priority: 8,
    aliases: ["parkinson's", "parkinsons", "parkinson"],
    links: [
      cks("parkinsons-disease", "Parkinson's disease"),
      nhs("conditions/parkinsons-disease/", "Parkinson's disease"),
    ],
  },
  {
    id: "glaucoma",
    priority: 8,
    aliases: ["glaucoma"],
    links: [
      cks("glaucoma", "Glaucoma"),
      nhs("conditions/glaucoma/", "Glaucoma"),
    ],
  },
  {
    id: "conjunctivitis",
    priority: 8,
    aliases: ["conjunctivitis", "pink eye", "sticky eye"],
    links: [
      cks("conjunctivitis-infective", "Conjunctivitis - infective"),
      nhs("conditions/conjunctivitis/", "Conjunctivitis"),
    ],
  },
  {
    id: "epistaxis",
    priority: 8,
    aliases: ["epistaxis", "nosebleed", "nose bleed"],
    links: [
      cks("epistaxis-nosebleeds", "Epistaxis (nosebleeds)"),
      nhs("conditions/nosebleed/", "Nosebleed"),
    ],
  },
  {
    id: "suspected-cancer",
    priority: 6,
    aliases: ["suspected cancer", "2ww", "two week wait", "urgent cancer"],
    links: [nice("ng12", "Suspected cancer: recognition and referral (NG12)")],
  },

  // —— Common drugs (BNF) ——
  {
    id: "drug-amoxicillin",
    priority: 5,
    aliases: ["amoxicillin", "amoxycillin"],
    links: [bnf("amoxicillin", "Amoxicillin")],
  },
  {
    id: "drug-co-amoxiclav",
    priority: 5,
    aliases: ["co-amoxiclav", "coamoxiclav", "augmentin"],
    links: [bnf("co-amoxiclav", "Co-amoxiclav")],
  },
  {
    id: "drug-doxycycline",
    priority: 5,
    aliases: ["doxycycline"],
    links: [bnf("doxycycline", "Doxycycline")],
  },
  {
    id: "drug-nitrofurantoin",
    priority: 5,
    aliases: ["nitrofurantoin"],
    links: [bnf("nitrofurantoin", "Nitrofurantoin")],
  },
  {
    id: "drug-trimethoprim",
    priority: 5,
    aliases: ["trimethoprim"],
    links: [bnf("trimethoprim", "Trimethoprim")],
  },
  {
    id: "drug-clarithromycin",
    priority: 5,
    aliases: ["clarithromycin"],
    links: [bnf("clarithromycin", "Clarithromycin")],
  },
  {
    id: "drug-paracetamol",
    priority: 4,
    aliases: ["paracetamol", "acetaminophen"],
    links: [bnf("paracetamol", "Paracetamol")],
  },
  {
    id: "drug-ibuprofen",
    priority: 4,
    aliases: ["ibuprofen"],
    links: [bnf("ibuprofen", "Ibuprofen")],
  },
  {
    id: "drug-omeprazole",
    priority: 5,
    aliases: ["omeprazole", "ppi"],
    links: [bnf("omeprazole", "Omeprazole")],
  },
  {
    id: "drug-sertraline",
    priority: 5,
    aliases: ["sertraline"],
    links: [bnf("sertraline", "Sertraline")],
  },
  {
    id: "drug-amitriptyline",
    priority: 5,
    aliases: ["amitriptyline"],
    links: [bnf("amitriptyline-hydrochloride", "Amitriptyline hydrochloride")],
  },
  {
    id: "drug-metformin",
    priority: 5,
    aliases: ["metformin"],
    links: [bnf("metformin-hydrochloride", "Metformin hydrochloride")],
  },
  {
    id: "drug-amlodipine",
    priority: 5,
    aliases: ["amlodipine"],
    links: [bnf("amlodipine", "Amlodipine")],
  },
  {
    id: "drug-ramipril",
    priority: 5,
    aliases: ["ramipril"],
    links: [bnf("ramipril", "Ramipril")],
  },
  {
    id: "drug-bisoprolol",
    priority: 5,
    aliases: ["bisoprolol"],
    links: [bnf("bisoprolol-fumarate", "Bisoprolol fumarate")],
  },
  {
    id: "drug-apixaban",
    priority: 5,
    aliases: ["apixaban"],
    links: [bnf("apixaban", "Apixaban")],
  },
  {
    id: "drug-rivaroxaban",
    priority: 5,
    aliases: ["rivaroxaban"],
    links: [bnf("rivaroxaban", "Rivaroxaban")],
  },
  {
    id: "drug-edoxaban",
    priority: 5,
    aliases: ["edoxaban"],
    links: [bnf("edoxaban", "Edoxaban")],
  },
  {
    id: "drug-dabigatran",
    priority: 5,
    aliases: ["dabigatran"],
    links: [bnf("dabigatran-etexilate", "Dabigatran etexilate")],
  },
  {
    id: "drug-warfarin",
    priority: 5,
    aliases: ["warfarin"],
    links: [bnf("warfarin-sodium", "Warfarin sodium")],
  },
  {
    id: "drug-aspirin",
    priority: 4,
    aliases: ["aspirin"],
    links: [bnf("aspirin", "Aspirin")],
  },
  {
    id: "drug-prednisolone",
    priority: 5,
    aliases: ["prednisolone", "oral steroid"],
    links: [bnf("prednisolone", "Prednisolone")],
  },
  {
    id: "drug-methotrexate",
    priority: 5,
    aliases: ["methotrexate"],
    links: [bnf("methotrexate", "Methotrexate")],
  },
  {
    id: "drug-allopurinol",
    priority: 5,
    aliases: ["allopurinol"],
    links: [bnf("allopurinol", "Allopurinol")],
  },
  {
    id: "drug-lithium",
    priority: 5,
    aliases: ["lithium"],
    links: [bnf("lithium-carbonate", "Lithium carbonate")],
  },
  {
    id: "drug-prochlorperazine",
    priority: 5,
    aliases: ["prochlorperazine"],
    links: [bnf("prochlorperazine", "Prochlorperazine")],
  },
  {
    id: "drug-semaglutide",
    priority: 6,
    aliases: ["semaglutide", "ozempic", "wegovy"],
    links: [bnf("semaglutide", "Semaglutide")],
  },
  {
    id: "drug-tirzepatide",
    priority: 6,
    aliases: ["tirzepatide", "mounjaro"],
    links: [bnf("tirzepatide", "Tirzepatide")],
  },
  {
    id: "drug-liraglutide",
    priority: 6,
    aliases: ["liraglutide", "saxenda"],
    links: [bnf("liraglutide", "Liraglutide")],
  },
  {
    id: "drug-estradiol",
    priority: 5,
    aliases: ["oestradiol", "estradiol", "oestrogel", "evorel", "estradot", "sandrena"],
    links: [bnf("estradiol", "Estradiol")],
  },
  {
    id: "drug-progesterone",
    priority: 5,
    aliases: ["utrogestan", "micronised progesterone", "micronized progesterone", "progesterone"],
    links: [bnf("progesterone", "Progesterone")],
  },
  {
    id: "drug-tramadol",
    priority: 5,
    aliases: ["tramadol"],
    links: [bnf("tramadol-hydrochloride", "Tramadol hydrochloride")],
  },
  {
    id: "drug-sodium-valproate",
    priority: 8,
    aliases: ["sodium valproate", "valproate", "epilim"],
    links: [
      bnf("sodium-valproate", "Sodium valproate"),
      gov("guidance/valproate-use-by-women-and-girls", "Valproate use by women and girls"),
    ],
  },
  {
    id: "influenza",
    priority: 9,
    aliases: ["influenza", "the flu", "flu"],
    links: [
      cks("influenza-seasonal", "Influenza - seasonal"),
      nhs("conditions/flu/", "Flu"),
    ],
  },
  {
    id: "covid-19",
    priority: 9,
    aliases: ["covid-19", "covid 19", "covid", "sars-cov-2", "coronavirus"],
    niceCodes: ["ng191"],
    links: [
      nice("ng191", "COVID-19 rapid guideline (NG191)"),
      nhs("conditions/covid-19/", "COVID-19"),
    ],
  },
  {
    id: "measles",
    priority: 10,
    aliases: ["measles"],
    links: [
      cks("measles", "Measles"),
      gov("government/collections/immunisation-against-infectious-disease-the-green-book", "The Green Book"),
      nhs("conditions/measles/", "Measles"),
    ],
  },
  {
    id: "chickenpox",
    priority: 9,
    aliases: ["chickenpox", "chicken pox", "varicella"],
    links: [
      cks("chickenpox", "Chickenpox"),
      nhs("conditions/chickenpox/", "Chickenpox"),
    ],
  },
  {
    id: "whooping-cough",
    priority: 9,
    aliases: ["whooping cough", "pertussis"],
    links: [
      cks("whooping-cough", "Whooping cough"),
      nhs("conditions/whooping-cough/", "Whooping cough"),
    ],
  },
  {
    id: "glandular-fever",
    priority: 8,
    aliases: ["glandular fever", "infectious mononucleosis", "ebv"],
    links: [
      cks("glandular-fever-infectious-mononucleosis", "Glandular fever (infectious mononucleosis)"),
      nhs("conditions/glandular-fever/", "Glandular fever"),
    ],
  },
  {
    id: "scabies",
    priority: 9,
    aliases: ["scabies"],
    links: [
      cks("scabies", "Scabies"),
      pcds("scabies", "Scabies"),
      dermnet("scabies", "Scabies"),
      nhs("conditions/scabies/", "Scabies"),
    ],
  },
  {
    id: "urticaria",
    priority: 8,
    aliases: ["urticaria", "hives", "nettle rash"],
    links: [
      cks("urticaria", "Urticaria"),
      pcds("urticaria", "Urticaria"),
      dermnet("urticaria", "Urticaria"),
    ],
  },
  {
    id: "rosacea",
    priority: 8,
    aliases: ["rosacea"],
    links: [
      cks("rosacea", "Rosacea"),
      pcds("rosacea", "Rosacea"),
      dermnet("rosacea", "Rosacea"),
    ],
  },
  {
    id: "anaphylaxis",
    priority: 14,
    aliases: ["anaphylaxis", "anaphylactic"],
    links: [
      cks("angio-oedema-and-anaphylaxis", "Angio-oedema and anaphylaxis"),
      nhs("conditions/anaphylaxis/", "Anaphylaxis"),
    ],
  },
  {
    id: "coeliac",
    priority: 8,
    aliases: ["coeliac", "celiac"],
    links: [
      cks("coeliac-disease", "Coeliac disease"),
      nhs("conditions/coeliac-disease/", "Coeliac disease"),
    ],
  },
  {
    id: "ibd",
    priority: 9,
    aliases: ["crohn's", "crohns", "ulcerative colitis", "inflammatory bowel", "ibd"],
    links: [
      cks("crohns-disease", "Crohn's disease"),
      cks("ulcerative-colitis", "Ulcerative colitis"),
      nhs("conditions/inflammatory-bowel-disease/", "Inflammatory bowel disease"),
    ],
  },
  {
    id: "diverticular",
    priority: 8,
    aliases: ["diverticular", "diverticulitis", "diverticulosis"],
    links: [
      cks("diverticular-disease", "Diverticular disease"),
      nhs("conditions/diverticular-disease-and-diverticulitis/", "Diverticular disease and diverticulitis"),
    ],
  },
  {
    id: "gallstones",
    priority: 8,
    aliases: ["gallstones", "cholecystitis", "biliary colic"],
    links: [
      cks("gallstones", "Gallstones"),
      nhs("conditions/gallstones/", "Gallstones"),
    ],
  },
  {
    id: "h-pylori",
    priority: 8,
    aliases: ["helicobacter", "h pylori", "h. pylori", "peptic ulcer"],
    links: [
      cks("dyspepsia-proven-peptic-ulcer", "Dyspepsia - proven peptic ulcer"),
      nhs("conditions/stomach-ulcer/", "Stomach ulcer"),
    ],
  },
  {
    id: "hepatitis",
    priority: 8,
    aliases: ["hepatitis b", "hepatitis c", "hep b", "hep c"],
    links: [
      cks("hepatitis-b", "Hepatitis B"),
      cks("hepatitis-c", "Hepatitis C"),
      nhs("conditions/hepatitis-b/", "Hepatitis B"),
      nhs("conditions/hepatitis-c/", "Hepatitis C"),
    ],
  },
  {
    id: "hiv",
    priority: 9,
    aliases: ["hiv", "human immunodeficiency"],
    links: [
      cks("hiv-infection-and-aids", "HIV infection and AIDS"),
      nhs("conditions/hiv-and-aids/", "HIV and AIDS"),
    ],
  },
  {
    id: "pid",
    priority: 9,
    aliases: ["pelvic inflammatory", "pid"],
    links: [
      cks("pelvic-inflammatory-disease", "Pelvic inflammatory disease"),
      bashh("current-guidelines/genital-infections/", "BASHH genital infection guidelines"),
      nhs("conditions/pelvic-inflammatory-disease-pid/", "Pelvic inflammatory disease (PID)"),
    ],
  },
  {
    id: "hmb",
    priority: 8,
    aliases: ["heavy menstrual", "menorrhagia", "heavy periods"],
    niceCodes: ["ng88"],
    links: [
      cks("menorrhagia", "Menorrhagia"),
      nice("ng88", "Heavy menstrual bleeding (NG88)"),
      nhs("conditions/heavy-periods/", "Heavy periods"),
    ],
  },
  {
    id: "fibroids",
    priority: 8,
    aliases: ["fibroids", "leiomyoma"],
    links: [
      cks("fibroids", "Fibroids"),
      nhs("conditions/fibroids/", "Fibroids"),
    ],
  },
  {
    id: "dysmenorrhoea",
    priority: 8,
    aliases: ["dysmenorrhoea", "dysmenorrhea", "period pain"],
    links: [
      cks("dysmenorrhoea", "Dysmenorrhoea"),
      nhs("conditions/period-pain/", "Period pain"),
    ],
  },
  {
    id: "emergency-contraception",
    priority: 10,
    aliases: ["emergency contraception", "morning after pill", "ellaone", "levonelle"],
    links: [
      cks("contraception-emergency", "Contraception - emergency"),
      fsrh("standards-and-guidance/documents/ceu-clinical-guidance-emergency-contraception/", "Emergency contraception"),
    ],
  },
  {
    id: "postnatal-depression",
    priority: 9,
    aliases: ["postnatal depression", "postpartum depression", "post natal depression"],
    links: [
      cks("depression-antenatal-and-postnatal", "Depression - antenatal and postnatal"),
      nhs("mental-health/conditions/post-natal-depression/", "Postnatal depression"),
    ],
  },
  {
    id: "mastitis",
    priority: 8,
    aliases: ["mastitis", "breast abscess"],
    links: [
      cks("mastitis-and-breast-abscess", "Mastitis and breast abscess"),
      nhs("conditions/mastitis/", "Mastitis"),
    ],
  },
  {
    id: "falls",
    priority: 9,
    aliases: ["falls risk", "recurrent falls", "falls in older", "fallen"],
    niceCodes: ["ng32"],
    links: [
      cks("falls-risk-assessment", "Falls - risk assessment"),
      nice("ng32", "Falls in older people (NG32)"),
      nhs("conditions/falls/", "Falls"),
    ],
  },
  {
    id: "vitamin-d",
    priority: 8,
    aliases: ["vitamin d deficiency", "vitamin d", "colecalciferol", "cholecalciferol"],
    links: [
      cks("vitamin-d-deficiency-in-adults", "Vitamin D deficiency in adults"),
      bnf("colecalciferol", "Colecalciferol"),
    ],
  },
  {
    id: "b12",
    priority: 8,
    aliases: ["vitamin b12", "b12 deficiency", "pernicious anaemia", "pernicious anemia"],
    links: [
      cks("anaemia-b12-and-folate-deficiency", "Anaemia - B12 and folate deficiency"),
      nhs("conditions/vitamin-b12-or-folate-deficiency-anaemia/", "Vitamin B12 or folate deficiency anaemia"),
    ],
  },
  {
    id: "alcohol",
    priority: 9,
    aliases: ["alcohol dependence", "alcohol misuse", "harmful drinking", "aud"],
    niceCodes: ["ng65"],
    links: [
      cks("alcohol-problem-drinking", "Alcohol - problem drinking"),
      nice("ng65", "Alcohol-use disorders (NG65)"),
      nhs("conditions/alcohol-misuse/", "Alcohol misuse"),
    ],
  },
  {
    id: "bipolar",
    priority: 8,
    aliases: ["bipolar", "manic depression"],
    links: [
      cks("bipolar-disorder", "Bipolar disorder"),
      nhs("mental-health/conditions/bipolar-disorder/", "Bipolar disorder"),
    ],
  },
  {
    id: "psychosis",
    priority: 8,
    aliases: ["schizophrenia", "psychosis", "psychotic"],
    links: [
      cks("psychosis-and-schizophrenia", "Psychosis and schizophrenia"),
      nhs("mental-health/conditions/schizophrenia/", "Schizophrenia"),
    ],
  },
  {
    id: "adhd",
    priority: 8,
    aliases: ["attention deficit", "adhd"],
    niceCodes: ["ng87"],
    links: [
      cks("attention-deficit-hyperactivity-disorder", "Attention deficit hyperactivity disorder"),
      nice("ng87", "Attention deficit hyperactivity disorder (NG87)"),
      nhs("conditions/attention-deficit-hyperactivity-disorder-adhd/", "ADHD"),
    ],
  },
  {
    id: "autism",
    priority: 8,
    aliases: ["autism", "asd", "autistic"],
    niceCodes: ["ng58"],
    links: [
      nice("ng58", "Autism spectrum disorder in under 19s (NG58)"),
      nhs("conditions/autism/", "Autism"),
    ],
  },
  {
    id: "sleep-apnoea",
    priority: 8,
    aliases: ["sleep apnoea", "sleep apnea", "osa", "obstructive sleep"],
    links: [
      cks("obstructive-sleep-apnoea-syndrome", "Obstructive sleep apnoea syndrome"),
      nhs("conditions/sleep-apnoea/", "Sleep apnoea"),
    ],
  },
  {
    id: "gca",
    priority: 12,
    aliases: ["giant cell arteritis", "temporal arteritis", "gca"],
    links: [
      cks("giant-cell-arteritis", "Giant cell arteritis"),
      nhs("conditions/temporal-arteritis/", "Temporal arteritis"),
    ],
  },
  {
    id: "pmr",
    priority: 9,
    aliases: ["polymyalgia rheumatica", "polymyalgia", "pmr"],
    links: [
      cks("polymyalgia-rheumatica", "Polymyalgia rheumatica"),
      nhs("conditions/polymyalgia-rheumatica/", "Polymyalgia rheumatica"),
    ],
  },
  {
    id: "pad",
    priority: 8,
    aliases: ["peripheral arterial", "peripheral vascular", "claudication", "pad"],
    links: [
      cks("peripheral-arterial-disease", "Peripheral arterial disease"),
      nhs("conditions/peripheral-arterial-disease-pad/", "Peripheral arterial disease (PAD)"),
    ],
  },
  {
    id: "haemorrhoids",
    priority: 8,
    aliases: ["haemorrhoids", "hemorrhoids", "piles"],
    links: [
      cks("haemorrhoids", "Haemorrhoids"),
      nhs("conditions/piles-haemorrhoids/", "Piles (haemorrhoids)"),
    ],
  },
  {
    id: "prostatitis",
    priority: 8,
    aliases: ["prostatitis"],
    links: [
      cks("prostatitis-acute", "Prostatitis - acute"),
      nhs("conditions/prostatitis/", "Prostatitis"),
    ],
  },
  {
    id: "diabetic-foot",
    priority: 10,
    aliases: ["diabetic foot", "foot ulcer"],
    niceCodes: ["ng19"],
    links: [
      cks("diabetes-type-2", "Diabetes - type 2"),
      nice("ng19", "Diabetic foot problems (NG19)"),
      nhs("conditions/diabetic-foot-problems/", "Diabetic foot problems"),
    ],
  },
  {
    id: "melanoma",
    priority: 11,
    aliases: ["melanoma", "pigmented lesion", "changing mole"],
    links: [
      cks("melanoma-and-pigmented-lesions", "Melanoma and pigmented lesions"),
      dermnet("melanoma", "Melanoma"),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
    ],
  },
  {
    id: "lung-cancer",
    priority: 11,
    aliases: ["lung cancer", "haemoptysis", "hemoptysis"],
    links: [
      cks("lung-and-pleural-cancers-recognition-referral", "Lung and pleural cancers - recognition and referral"),
      nice("ng12", "Suspected cancer: recognition and referral (NG12)"),
      nhs("conditions/lung-cancer/", "Lung cancer"),
    ],
  },
  {
    id: "immunisation",
    priority: 8,
    aliases: ["immunisation", "immunization", "vaccination", "vaccine schedule", "green book"],
    links: [
      gov("government/collections/immunisation-against-infectious-disease-the-green-book", "The Green Book"),
      nhs("vaccinations/", "NHS vaccinations"),
    ],
  },
  {
    id: "malaria",
    priority: 8,
    aliases: ["malaria"],
    links: [
      cks("malaria", "Malaria"),
      nhs("conditions/malaria/", "Malaria"),
    ],
  },
  {
    id: "lyme",
    priority: 8,
    aliases: ["lyme disease", "lyme", "borrelia"],
    niceCodes: ["ng95"],
    links: [
      cks("lyme-disease", "Lyme disease"),
      nice("ng95", "Lyme disease (NG95)"),
      nhs("conditions/lyme-disease/", "Lyme disease"),
    ],
  },
  {
    id: "red-eye",
    priority: 8,
    aliases: ["red eye", "painful eye", "acute glaucoma"],
    links: [
      cks("red-eye", "Red eye"),
      nhs("conditions/red-eye/", "Red eye"),
    ],
  },
  {
    id: "tinnitus",
    priority: 7,
    aliases: ["tinnitus"],
    links: [
      cks("tinnitus", "Tinnitus"),
      nhs("conditions/tinnitus/", "Tinnitus"),
    ],
  },
  {
    id: "hearing-loss",
    priority: 8,
    aliases: ["hearing loss", "deafness", "sudden hearing"],
    links: [
      cks("hearing-loss-in-adults", "Hearing loss in adults"),
      nhs("conditions/hearing-loss/", "Hearing loss"),
    ],
  },
  {
    id: "head-lice",
    priority: 7,
    aliases: ["head lice", "nits"],
    links: [
      cks("head-lice", "Head lice"),
      nhs("conditions/head-lice-and-nits/", "Head lice and nits"),
    ],
  },
  {
    id: "threadworm",
    priority: 7,
    aliases: ["threadworm", "pinworm", "enterobius"],
    links: [
      cks("threadworm", "Threadworm"),
      nhs("conditions/threadworms/", "Threadworms"),
    ],
  },
  {
    id: "nappy-rash",
    priority: 7,
    aliases: ["nappy rash", "diaper rash"],
    links: [
      cks("nappy-rash", "Nappy rash"),
      nhs("conditions/nappy-rash/", "Nappy rash"),
    ],
  },
  {
    id: "cows-milk-allergy",
    priority: 8,
    aliases: ["cow's milk allergy", "cows milk allergy", "cmpa"],
    links: [
      cks("cows-milk-allergy-in-children", "Cow's milk allergy in children"),
      nhs("conditions/cows-milk-allergy/", "Cow's milk allergy"),
    ],
  },
  {
    id: "constipation-child",
    priority: 8,
    aliases: ["constipation in children", "child constipation", "constipated child"],
    links: [
      cks("constipation-in-children", "Constipation in children"),
      nhs("conditions/constipation/", "Constipation"),
    ],
  },
  ...EXTRA_DRUG_ENTRIES,
];

const PUBLISHER_PREF: Record<string, number> = {
  "NICE CKS": 5,
  BNF: 5,
  BNFC: 5,
  NICE: 4,
  SIGN: 4,
  RCOG: 4,
  FSRH: 4,
  BASHH: 4,
  "BMJ Best Practice": 3,
  BTS: 3,
  PCDS: 3,
  "UKHSA / GOV.UK": 3,
  DermNet: 2,
  NHS: 2,
};

const GENERIC_ALIASES = new Set([
  "fever",
  "rash",
  "pain",
  "cough",
  "fatigue",
  "tiredness",
  "flu",
  "fallen",
  "vaccine schedule",
]);

/** If a named drug also matched, these topic aliases are too vague to attach. */
const WEAK_TOPIC_WITH_DRUG = new Set([
  "pregnancy",
  "pregnant",
  "antenatal",
  "diabetes",
  "infection",
  "pain",
  "rash",
]);

const NICE_CODE_RE = /\b(ng|cg|qs|ta)\s*(\d+)\b/gi;

const normalizeGuidanceText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bdiarrhea\b/g, "diarrhoea")
    .replace(/\banemia\b/g, "anaemia")
    .replace(/\bhematuria\b/g, "haematuria")
    .replace(/\bestrogen\b/g, "oestrogen")
    .replace(/\bestradiol\b/g, "oestradiol")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const aliasMatches = (haystack: string, alias: string): boolean => {
  const needle = alias.trim().toLowerCase();
  if (!needle) return false;
  // Short tokens need strict word boundaries to avoid false positives (e.g. "af", "uti").
  const pattern =
    needle.length <= 3
      ? new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`, "i")
      : new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`, "i");
  return pattern.test(haystack);
};

type ScoredEntry = {
  entry: CuratedGuidanceEntry;
  score: number;
  matchedAlias: string;
};

const extractNiceCodes = (text: string): string[] => {
  const codes: string[] = [];
  const re = new RegExp(NICE_CODE_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    codes.push(`${match[1].toLowerCase()}${match[2]}`);
  }
  return [...new Set(codes)];
};

export const mergeGuidanceEntries = (
  base: CuratedGuidanceEntry[],
  overlay: CuratedGuidanceEntry[]
): CuratedGuidanceEntry[] => {
  if (overlay.length === 0) return base;
  const byId = new Map(base.map((entry) => [entry.id, entry]));
  for (const entry of overlay) {
    if (!entry.id || entry.aliases.length === 0 || entry.links.length === 0) continue;
    byId.set(entry.id, entry);
  }
  return [...byId.values()];
};

const scoreEntry = (
  entry: CuratedGuidanceEntry,
  question: string,
  answer: string,
  niceCodes: string[]
): ScoredEntry | null => {
  const codeHit = entry.niceCodes?.some((code) => niceCodes.includes(code.toLowerCase())) ?? false;
  const aliases = [...entry.aliases].sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const inQuestion = aliasMatches(question, alias);
    const inAnswer = !inQuestion && aliasMatches(answer, alias);
    if (!inQuestion && !inAnswer && !codeHit) continue;
    if (!inQuestion && !inAnswer && codeHit) {
      return {
        entry,
        score: 120 + (entry.priority ?? 0),
        matchedAlias: entry.niceCodes?.[0] ?? alias,
      };
    }
    const priority = entry.priority ?? 0;
    const genericPenalty = GENERIC_ALIASES.has(alias.trim().toLowerCase()) ? 35 : 0;
    const score =
      alias.length * 10 +
      priority +
      (inQuestion ? 20 : 0) +
      (alias.includes(" ") ? 8 : 0) +
      (codeHit ? 40 : 0) -
      genericPenalty;
    return { entry, score, matchedAlias: alias };
  }
  if (codeHit) {
    return { entry, score: 120 + (entry.priority ?? 0), matchedAlias: entry.niceCodes?.[0] ?? entry.id };
  }
  return null;
};

const pushUniqueLinks = (
  selected: OfficialGuidanceLink[],
  candidates: OfficialGuidanceLink[],
  requireNewPublisher: boolean,
  seenUrls: Set<string>,
  seenPublishers: Set<string>
) => {
  const ranked = [...candidates].sort(
    (a, b) => (PUBLISHER_PREF[b.publisher] ?? 0) - (PUBLISHER_PREF[a.publisher] ?? 0)
  );
  for (const link of ranked) {
    if (selected.length >= MAX_OFFICIAL_GUIDANCE) return;
    if (!isTrustedOfficialUrl(link.url)) continue;
    const href = link.url.toLowerCase().split("#")[0].replace(/\/$/, "");
    if (seenUrls.has(href)) continue;
    if (requireNewPublisher && seenPublishers.has(link.publisher) && selected.length > 0) {
      continue;
    }
    seenUrls.add(href);
    seenPublishers.add(link.publisher);
    selected.push(link);
  }
};

/**
 * Resolve related official guidance from the curated map only (no live search).
 * Returns at most MAX_OFFICIAL_GUIDANCE trusted links, or [] when unsure.
 */
export const lookupCuratedOfficialGuidance = (
  question: string,
  answer = "",
  extraEntries: CuratedGuidanceEntry[] = []
): OfficialGuidanceLink[] => {
  const q = normalizeGuidanceText(question);
  const a = normalizeGuidanceText(answer);
  if (q.length < 3) return [];

  const catalog = mergeGuidanceEntries(CURATED_GUIDANCE_ENTRIES, extraEntries);
  const niceCodes = extractNiceCodes(`${q} ${a}`);

  const scored = catalog.map((entry) => scoreEntry(entry, q, a, niceCodes))
    .filter((item): item is ScoredEntry => Boolean(item))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return (right.entry.priority ?? 0) - (left.entry.priority ?? 0);
    });

  if (scored.length === 0) return [];

  const bestDrug = scored.find((item) => item.entry.id.startsWith("drug-")) ?? null;
  const bestTopic =
    scored.find((item) => {
      if (item.entry.id.startsWith("drug-")) return false;
      if (
        bestDrug &&
        WEAK_TOPIC_WITH_DRUG.has(item.matchedAlias.toLowerCase())
      ) {
        return false;
      }
      return true;
    }) ?? null;
  const secondaryTopic =
    bestTopic == null
      ? null
      : scored.find((item) => {
          if (item.entry.id.startsWith("drug-")) return false;
          if (item.entry.id === bestTopic.entry.id) return false;
          return item.score >= bestTopic.score * 0.7;
        }) ?? null;

  const topics = [bestTopic, secondaryTopic].filter(
    (item): item is ScoredEntry => Boolean(item)
  );

  const selected: OfficialGuidanceLink[] = [];
  const seenUrls = new Set<string>();
  const seenPublishers = new Set<string>();

  // Leave one slot for a BNF page when a named drug matched.
  const topicBudget = bestDrug ? MAX_OFFICIAL_GUIDANCE - 1 : MAX_OFFICIAL_GUIDANCE;

  const tryPush = (link: OfficialGuidanceLink, budget: number, requireNewPublisher: boolean) => {
    if (selected.length >= budget) return;
    if (!isTrustedOfficialUrl(link.url)) return;
    const href = link.url.toLowerCase().split("#")[0].replace(/\/$/, "");
    if (seenUrls.has(href)) return;
    if (requireNewPublisher && seenPublishers.has(link.publisher) && selected.length > 0) return;
    seenUrls.add(href);
    seenPublishers.add(link.publisher);
    selected.push(link);
  };

  for (const item of topics) {
    const ranked = [...item.entry.links].sort(
      (left, right) =>
        (PUBLISHER_PREF[right.publisher] ?? 0) - (PUBLISHER_PREF[left.publisher] ?? 0)
    );
    for (const link of ranked) tryPush(link, topicBudget, true);
  }
  for (const item of topics) {
    for (const link of item.entry.links) tryPush(link, topicBudget, false);
  }

  if (bestDrug) {
    pushUniqueLinks(selected, bestDrug.entry.links, true, seenUrls, seenPublishers);
    pushUniqueLinks(selected, bestDrug.entry.links, false, seenUrls, seenPublishers);
  }

  return selected;
};

export const assertCuratedGuidanceMapIntegrity = (): {
  entryCount: number;
  linkCount: number;
  invalidUrls: string[];
} => {
  const invalidUrls: string[] = [];
  let linkCount = 0;
  for (const entry of CURATED_GUIDANCE_ENTRIES) {
    if (!entry.id || entry.aliases.length === 0 || entry.links.length === 0) {
      invalidUrls.push(`entry:${entry.id || "(missing id)"}`);
      continue;
    }
    for (const link of entry.links) {
      linkCount += 1;
      if (!isTrustedOfficialUrl(link.url)) {
        invalidUrls.push(link.url);
      }
    }
  }
  return {
    entryCount: CURATED_GUIDANCE_ENTRIES.length,
    linkCount,
    invalidUrls,
  };
};
