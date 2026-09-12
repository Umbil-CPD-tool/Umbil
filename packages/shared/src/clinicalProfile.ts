export const UK_NATIONS = ["England", "Scotland", "Wales", "Northern Ireland"] as const;
export type UkNation = (typeof UK_NATIONS)[number];

export const WORKPLACE_SETTINGS = [
  "GP / Primary care",
  "Hospital",
  "Community",
  "Medical school",
  "Other",
] as const;
export type WorkplaceSetting = (typeof WORKPLACE_SETTINGS)[number];

export const GRADE_SUGGESTIONS = [
  "5th Year Medical Student",
  "FY1",
  "FY2",
  "GP",
  "GPST2",
  "ST4 Cardiology",
  "Consultant",
  "ANP",
  "Physician Associate",
] as const;

export const SPECIALTY_SUGGESTIONS = [
  "General Practice",
  "Emergency Medicine",
  "Acute Medicine",
  "Cardiology",
  "Paediatrics",
  "Psychiatry",
  "Obstetrics & Gynaecology",
  "General Surgery",
  "Trauma & Orthopaedics",
  "Anaesthetics",
  "Geriatrics",
  "Foundation (undifferentiated)",
] as const;

export const GRADE_PLACEHOLDER = "e.g., 5th Year Medical Student, GP, ST4 Cardiology";
export const SPECIALTY_PLACEHOLDER = "e.g., General Practice, Cardiology, Emergency Medicine";

export const CLINICAL_PROFILE_HINT =
  "Grade and specialty pitch answers to your level. Nation and setting help with UK pathways (NICE vs SIGN) and later aggregated, de-identified reporting — never sold as a named record.";

export const MEMORY_FIELD_HINT =
  "Preferences only (e.g. tables, safety-netting). Your grade and specialty are stored in the fields above and applied automatically — no need to repeat them here. Umbil may also add things you tell it in chat.";

export type AudienceBand =
  | "student"
  | "foundation"
  | "gp"
  | "specialty_trainee"
  | "consultant"
  | "ahp"
  | "unknown";

export type ClinicianContextInput = {
  full_name?: string | null;
  grade?: string | null;
  specialty?: string | null;
  nation?: string | null;
  workplace_setting?: string | null;
};

export type MissingProfileFields = {
  missingName: boolean;
  missingGrade: boolean;
  missingSpecialty: boolean;
};

const SPECIALTY_FROM_TEXT = [
  "general practice",
  "emergency medicine",
  "acute medicine",
  "cardiology",
  "paediatrics",
  "pediatrics",
  "psychiatry",
  "obstetrics",
  "gynaecology",
  "gynecology",
  "general surgery",
  "orthopaedics",
  "orthopedics",
  "anaesthetics",
  "anesthetics",
  "geriatrics",
  "oncology",
  "dermatology",
  "neurology",
  "gastroenterology",
  "respiratory",
  "renal",
  "urology",
  "ent",
] as const;

const compact = (value: string | null | undefined): string => value?.trim() ?? "";

export const isUkNation = (value: string | null | undefined): value is UkNation =>
  UK_NATIONS.includes(compact(value) as UkNation);

export const isWorkplaceSetting = (
  value: string | null | undefined
): value is WorkplaceSetting =>
  WORKPLACE_SETTINGS.includes(compact(value) as WorkplaceSetting);

export const getMissingProfileFields = (
  profile: { full_name?: string | null; grade?: string | null; specialty?: string | null } | null
): MissingProfileFields => ({
  missingName: !compact(profile?.full_name),
  missingGrade: !compact(profile?.grade),
  missingSpecialty: !compact(profile?.specialty),
});

export const isProfileIncomplete = (
  profile: { full_name?: string | null; grade?: string | null; specialty?: string | null } | null
): boolean => {
  if (!profile) return false;
  const missing = getMissingProfileFields(profile);
  return missing.missingName || missing.missingGrade || missing.missingSpecialty;
};

export const profileCompletionTitle = ({
  missingName,
  missingGrade,
  missingSpecialty,
}: MissingProfileFields): string => {
  if (missingName && (missingGrade || missingSpecialty)) {
    return "Add your name, grade and specialty";
  }
  if (missingName) return "Add your name";
  if (missingGrade && missingSpecialty) return "Add your grade and specialty";
  if (missingGrade) return "Add your position / grade";
  return "Add your specialty";
};

export const validateSignupClinicalProfile = (input: {
  grade?: string | null;
  specialty?: string | null;
}): string | null => {
  if (!compact(input.grade)) return "Please enter your position or grade.";
  if (!compact(input.specialty)) return "Please enter your specialty.";
  return null;
};

export const inferAudienceBand = (grade: string | null | undefined): AudienceBand => {
  const text = compact(grade).toLowerCase();
  if (!text) return "unknown";

  if (/\b(student|undergraduate|year\s*[1-6]|med\s*student)\b/.test(text)) return "student";
  if (/\b(consultant|attending)\b/.test(text)) return "consultant";
  if (/\b(anp|acp|nurse|midwife|pharmacist|paramedic|physician\s+associate|physician\s+assistant|fcp)\b/.test(text)) {
    return "ahp";
  }
  if (/\b(gpst\d*|general\s+practitioner|gp(?:\s+(?:trainee|registrar|partner))?)\b/.test(text)) {
    return "gp";
  }
  if (/\b(st\s*[1-8]|specialty\s+registrar|registrar|resident|spr)\b/.test(text)) {
    return "specialty_trainee";
  }
  if (/\b(fy\s*[12]|f[12]|foundation|sho)\b/.test(text)) return "foundation";
  return "unknown";
};

export const resolveSpecialty = (
  grade: string | null | undefined,
  specialty: string | null | undefined
): string | null => {
  const explicit = compact(specialty);
  if (explicit) return explicit;

  const gradeText = compact(grade).toLowerCase();
  if (!gradeText) return null;

  const match = SPECIALTY_FROM_TEXT.find((name) => gradeText.includes(name));
  if (!match) return null;

  if (match === "pediatrics") return "Paediatrics";
  if (match === "gynecology") return "Gynaecology";
  if (match === "orthopedics") return "Orthopaedics";
  if (match === "anesthetics") return "Anaesthetics";
  return match.replace(/\b\w/g, (char) => char.toUpperCase());
};

const audiencePitch = (band: AudienceBand, specialty: string | null): string => {
  const specialtyBit = specialty ? ` in ${specialty}` : "";

  switch (band) {
    case "student":
      return "Pitch: medical student. Define jargon in a clause. Explain the mechanism only when it changes the decision. Do not assume they can prescribe or refer independently — state what the responsible clinician would do.";
    case "foundation":
      return "Pitch: foundation doctor. Practical ward or on-call steps, who to escalate to, and what they can start now versus what needs senior review.";
    case "gp":
      return "Pitch: GP / primary care. Lead with what can be done in the community, referral and 2WW thresholds, safety-netting, and the patient explanation. Skip hospital-only workup unless that is the question.";
    case "specialty_trainee":
      return `Pitch: specialty trainee${specialtyBit}. Assume general medicine. Lead with what changes specialty practice (when to take, investigate, or escalate). Flag consultant-only or local-protocol decisions. Do not lecture on basics unless asked.`;
    case "consultant":
      return `Pitch: consultant${specialtyBit}. Be concise and specialist. Skip textbook background. Note uncertainty, local protocol, or when another specialty should own the next step.`;
    case "ahp":
      return "Pitch: registered non-medical clinician. Stay within typical UK scope, name when a doctor or independent prescriber must act, and keep the advice usable at the point of care.";
    default:
      return "Pitch: UK clinician. Keep it practical. Do not invent a grade, specialty, or privileges they did not state.";
  }
};

const nationGuidance = (nation: string | null): string | null => {
  if (!nation) return null;
  if (nation === "Scotland") {
    return "Nation: Scotland — prefer SIGN where it applies, and say when NICE and SIGN differ.";
  }
  if (nation === "Wales") {
    return "Nation: Wales — NICE/CKS/BNF first; note All-Wales or local health-board variation when it matters.";
  }
  if (nation === "Northern Ireland") {
    return "Nation: Northern Ireland — NICE/CKS/BNF first; note regional pathway differences when they change the plan.";
  }
  return "Nation: England — NICE/CKS/BNF first.";
};

export const formatClinicianSignOff = (
  fullName: string | null | undefined,
  grade: string | null | undefined,
  specialty: string | null | undefined
): string => {
  const name = compact(fullName);
  if (!name) return "";
  const resolvedSpecialty = resolveSpecialty(grade, specialty);
  const extras = [compact(grade), resolvedSpecialty && compact(grade).toLowerCase().includes(resolvedSpecialty.toLowerCase()) ? "" : resolvedSpecialty]
    .filter(Boolean);
  return extras.length ? `${name}, ${extras.join(", ")}` : name;
};

export const buildClinicianContext = (input: ClinicianContextInput): string => {
  const grade = compact(input.grade);
  const specialty = resolveSpecialty(input.grade, input.specialty);
  const nation = isUkNation(input.nation) ? input.nation : compact(input.nation) || null;
  const setting = isWorkplaceSetting(input.workplace_setting)
    ? input.workplace_setting
    : compact(input.workplace_setting) || null;

  if (!grade && !specialty && !nation && !setting) return "";

  const band = inferAudienceBand(grade);
  const lines = [
    "CLINICIAN CONTEXT",
    grade ? `Role: ${grade}` : null,
    specialty ? `Specialty: ${specialty}` : null,
    setting ? `Setting: ${setting}` : null,
    nationGuidance(nation),
    `Audience: ${band.replaceAll("_", " ")}`,
    audiencePitch(band, specialty),
    "Do not invent privileges, posts, or qualifications they did not state.",
    "Do not announce that you are personalising the answer. Only change the substance.",
  ].filter(Boolean);

  return lines.join("\n");
};

export const buildClinicianPromptBlock = (input: ClinicianContextInput): string => {
  const context = buildClinicianContext(input);
  return context ? `\n${context}\n` : "";
};

export const signupMetadataFromClinicalProfile = (input: {
  grade: string;
  specialty: string;
  nation: string;
  workplace_setting: string;
}) => ({
  grade: compact(input.grade) || null,
  specialty: compact(input.specialty) || null,
  nation: isUkNation(input.nation) ? input.nation : null,
  workplace_setting: isWorkplaceSetting(input.workplace_setting) ? input.workplace_setting : null,
});
