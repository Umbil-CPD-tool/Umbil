/** Web paths used for deep links and “open in browser” flows. */
export const WEB_PATHS = {
  auth: "/auth",
  authCallback: "/auth/callback",
  updatePassword: "/auth/update-password",
  dashboard: "/dashboard",
  cpd: "/cpd",
  cpdAnalytics: "/cpd/analytics",
  captureLearning: "/capture-learning",
  pdp: "/pdp",
  psq: "/psq",
  psqAppraisals: "/psq-appraisals",
  msfAppraisals: "/msf-appraisals",
  profile: "/profile",
  settings: "/settings",
  pro: "/pro",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const API_PATHS = {
  ask: "/api/ask",
  tools: "/api/tools",
  generateReflection: "/api/generate-reflection",
  userStats: "/api/user/stats",
  weeklySummary: "/api/user/weekly-summary",
  stripeCheckout: "/api/stripe/checkout",
  stripePortal: "/api/stripe/portal",
  deleteAccount: "/api/auth/delete-account",
  msfInvite: "/api/msf/invite",
  msfAiSummary: "/api/public/msf/ai-summary",
  report: "/api/report",
} as const;

export const APP_SCHEME = "umbil";
