/**
 * Port of web `src/app/cpd/analytics/page.tsx` helpers — keep in sync.
 */

export const GMC_DOMAINS = [
  "Knowledge Skills & Performance",
  "Safety & Quality",
  "Communication Partnership & Teamwork",
  "Maintaining Trust",
] as const;

export const DEFAULT_CREDITS = 0.25;
export const ANNUAL_TARGET = 50;

export type TimeFilter = "week" | "month" | "year" | "all";

export type TaggedEntry = {
  timestamp: string;
  tags?: string[] | null;
};

export const getAdvisorMessage = (
  totalCredits: number,
  thisMonthCount: number
): string => {
  if (totalCredits === 0) {
    return "Welcome to your CPD journey! Start by logging your first clinical question or reflection to get the ball rolling.";
  }
  if (totalCredits >= ANNUAL_TARGET) {
    return "Outstanding! You have hit the 50-hour target for the year. Focus now on quality reflections and ensuring all GMC domains are covered.";
  }
  if (totalCredits >= ANNUAL_TARGET / 2) {
    return "Great progress! You are over halfway to your annual target. Review your 'GMC Domain Coverage' below to ensure you have a balanced portfolio.";
  }
  if (thisMonthCount > 4) {
    return "You're building great momentum this month! Consistency is key. Try adding a 'Deep Dive' reflection to boost your credit hours.";
  }
  return "You're off to a start. Aim for just 15 minutes (1 credit) a week to comfortably hit your appraisal target without the end-of-year panic.";
};

export const mapToGmcDomain = (tag: string): string | null => {
  const t = tag.toLowerCase().trim();
  if (
    t.includes("knowledge") ||
    t.includes("skills & performance") ||
    t.includes("skills and performance")
  ) {
    return GMC_DOMAINS[0];
  }
  if (t.includes("safety") || t.includes("quality")) return GMC_DOMAINS[1];
  if (
    t.includes("communication") ||
    t.includes("partnership") ||
    t.includes("teamwork")
  ) {
    return GMC_DOMAINS[2];
  }
  if (t.includes("maintaining") || t.includes("trust")) return GMC_DOMAINS[3];
  return null;
};

export const filterDataByTime = <T extends TaggedEntry>(
  entries: T[],
  filter: TimeFilter
): T[] => {
  const now = new Date();
  if (filter === "all") return entries;
  const startDate = new Date(now);
  if (filter === "week") startDate.setDate(now.getDate() - 7);
  else if (filter === "month") startDate.setMonth(now.getMonth() - 1);
  else if (filter === "year") startDate.setFullYear(now.getFullYear() - 1);
  return entries.filter((entry) => new Date(entry.timestamp) >= startDate);
};

export const processTagData = (entries: TaggedEntry[]) => {
  const tagCounts: Record<string, number> = {};
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      const gmcMatch = mapToGmcDomain(tag);
      if (!gmcMatch) {
        const cleanTag = tag.trim();
        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      }
    }
  }
  return Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const processGmcData = (entries: TaggedEntry[]) => {
  const gmcCounts: Record<string, number> = {
    [GMC_DOMAINS[0]]: 0,
    [GMC_DOMAINS[1]]: 0,
    [GMC_DOMAINS[2]]: 0,
    [GMC_DOMAINS[3]]: 0,
  };
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      const gmcMatch = mapToGmcDomain(tag);
      if (gmcMatch) gmcCounts[gmcMatch] = (gmcCounts[gmcMatch] || 0) + 1;
    }
  }
  return Object.entries(gmcCounts).map(([name, count]) => ({
    domain: name,
    fullDomain: name,
    count,
  }));
};

export const processTimelineData = (entries: TaggedEntry[]) => {
  const timelineMap: Record<string, number> = {};
  const toDateKey = (date: Date) => date.toISOString().split("T")[0];
  for (const entry of entries) {
    const dateKey = toDateKey(new Date(entry.timestamp));
    timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
  }
  return Object.entries(timelineMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const shortGmcLabel = (label: string): string[] => {
  if (label.includes("Communication")) {
    return ["Communication", "Partnership", "& Teamwork"];
  }
  if (label.includes("Knowledge")) return ["Knowledge Skills", "& Performance"];
  if (label.includes("Safety")) return ["Safety", "& Quality"];
  if (label.includes("Maintaining")) return ["Maintaining", "Trust"];
  return [label];
};
