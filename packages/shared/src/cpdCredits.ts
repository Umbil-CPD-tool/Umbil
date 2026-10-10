/** UK appraisal counting: 1 credit is 1 hour. A new Umbil log defaults to 10 minutes. */

export const MINUTES_PER_CREDIT = 60;
export const DEFAULT_LOG_MINUTES = 10;
export const ANNUAL_CREDIT_TARGET = 50;

export const creditsFromMinutes = (minutes: number | null | undefined): number => {
  const mins = typeof minutes === "number" && minutes > 0 ? minutes : DEFAULT_LOG_MINUTES;
  return mins / MINUTES_PER_CREDIT;
};

export const sumCredits = (entries: { duration?: number | null }[]): number => {
  const total = entries.reduce((sum, entry) => sum + creditsFromMinutes(entry.duration), 0);
  return Math.round(total * 100) / 100;
};

export const getLearningAdvisorMessage = (totalCredits: number, thisMonthCount: number): string => {
  if (totalCredits === 0) {
    return "Welcome to your CPD journey! Start by logging your first clinical question or reflection to get the ball rolling.";
  }
  if (totalCredits >= ANNUAL_CREDIT_TARGET) {
    return "Outstanding! You have hit the 50-hour target for the year. Focus now on quality reflections and ensuring all GMC domains are covered.";
  }
  if (totalCredits >= ANNUAL_CREDIT_TARGET / 2) {
    return "Great progress! You are over halfway to your annual target. Review your GMC domain coverage to keep the portfolio balanced.";
  }
  if (thisMonthCount > 4) {
    return "You're building great momentum this month. Consistency matters more than long single entries.";
  }
  return "You're off to a start. One credit is one hour. About an hour a week reaches the 50-credit year without a last-minute rush.";
};
