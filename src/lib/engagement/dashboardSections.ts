export const ENGAGEMENT_SECTIONS = [
  { id: "this-week", label: "This week", step: "1 · This week" },
  { id: "this-week-detail", label: "What they used", step: "2 · What they used" },
  { id: "trends", label: "Trends", step: "3 · Trends" },
  { id: "retention", label: "Retention", step: "4 · Retention" },
  { id: "since-launch", label: "Since launch", step: "5 · Since launch" },
  { id: "funnel", label: "Funnel", step: "6 · The leak" },
  { id: "regulars", label: "Regulars", step: "7 · Regulars" },
  { id: "revenue", label: "Paying", step: "8 · Paying" },
  { id: "upgrade", label: "Upgrade", step: "9 · Upgrade" },
  { id: "ads", label: "Ads", step: "10 · Ads" },
] as const;

export type EngagementSectionId = (typeof ENGAGEMENT_SECTIONS)[number]["id"];

export const engagementStep = (id: EngagementSectionId): string =>
  ENGAGEMENT_SECTIONS.find((section) => section.id === id)?.step ?? "";
