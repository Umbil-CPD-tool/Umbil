export const FREE_QUESTION_LIMIT = 10;
export const FREE_TOOL_LIMIT = 1;
export const FREE_CPD_LIMIT = 1;

export const PRO_TRIAL_DAYS = 7;
export const STUDENT_MONTHLY_GBP = "£4.99";
export const PRO_MONTHLY_GBP = "£14.99";
export const CLINICIAN_TRANSITION_GBP = "£9.99";
export const CLINICIAN_TRANSITION_MONTHS = 3;

/**
 * Fresh counters for the new caps. Older per-style question rows, and the previous
 * tool and learning-log rows, stay in the database but do not count this month.
 */
export const QUESTION_USAGE_FEATURE = "ask_questions";
export const QUESTION_USAGE_FEATURES = [QUESTION_USAGE_FEATURE] as const;
export const TOOL_USAGE_FEATURE = "clinical_tool";
export const CPD_USAGE_FEATURE = "cpd_log";

export type UsageCountRow = {
  feature: string;
  usage_count?: number | null;
  last_reset_date?: string | null;
};

export const countInCurrentMonth = (
  usageCount: number | null | undefined,
  lastReset: string | null | undefined,
  now: Date
): number => {
  const count = usageCount ?? 0;
  if (!lastReset) return count;
  const last = new Date(lastReset);
  if (Number.isNaN(last.getTime())) return count;
  if (last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear()) return 0;
  return count;
};

export const summedMonthlyUsage = (
  rows: readonly UsageCountRow[],
  features: readonly string[],
  now: Date
): number =>
  rows.reduce((total, row) => {
    if (!features.includes(row.feature)) return total;
    return total + countInCurrentMonth(row.usage_count, row.last_reset_date, now);
  }, 0);

/** Cap for the shared question counter. Older per-style rows are not included. */
export const questionIncrementRoom = (
  _rows?: readonly UsageCountRow[],
  _now?: Date
): number => FREE_QUESTION_LIMIT;

export const remainingOf = (used: number, limit: number): number => Math.max(0, limit - used);

export type AllowanceKind = "questions" | "tools" | "cpd";

export const allowanceHint = (kind: AllowanceKind, remaining: number): string => {
  if (kind === "questions") {
    if (remaining === 0) return "No questions left this month.";
    return remaining === 1 ? "1 question left this month." : `${remaining} questions left this month.`;
  }
  if (kind === "tools") {
    if (remaining === 0) return "No tool generations left this month.";
    return remaining === 1
      ? "1 tool generation left this month."
      : `${remaining} tool generations left this month.`;
  }
  if (remaining === 0) {
    return "This month's free learning log is used. Saved entries stay available to read and export.";
  }
  return "1 learning log left this month. Saved entries stay available to read and export.";
};

const STUDENT_GRADE = /student|pre[\s-]*med|\b[1-6](?:st|nd|rd|th)\s+year|\by[1-6]\b/i;
const CLINICIAN_GRADE = /\b(gp|fy\s*[12]|anp|paramedic|consultant|registrar|doctor|educator|pharmacist)\b/i;

export const isUkAcademicEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.ac\.uk$/i.test(email.trim());
};

export const isStudentMailbox = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  const [local, domain = ""] = trimmed.split("@");
  return /student/.test(local) || /(?:^|\.)(?:student|study)\./.test(domain);
};

export type TransitionOffer = "student" | "clinician";

export const transitionOfferFor = (profile: {
  email?: string | null;
  academic_email?: string | null;
  grade?: string | null;
}): TransitionOffer => {
  const grade = profile.grade?.trim() ?? "";
  const studentGrade = STUDENT_GRADE.test(grade);
  const clinicianGrade = CLINICIAN_GRADE.test(grade);
  if (studentGrade && !clinicianGrade) return "student";
  if (clinicianGrade && !studentGrade) return "clinician";
  if (isStudentMailbox(profile.email) || isStudentMailbox(profile.academic_email)) return "student";
  if (isUkAcademicEmail(profile.email) || isUkAcademicEmail(profile.academic_email)) return "student";
  return "clinician";
};

/** Trial applies when someone checks out Umbil Pro. Student and Team plans are billed immediately. */
export const trialPeriodDays = (planType: string): number | null =>
  planType === "pro_monthly" || planType === "pro_annual" ? PRO_TRIAL_DAYS : null;
