export type CPDEntry = {
  id?: string;
  user_id?: string;
  timestamp: string;
  question: string;
  answer: string;
  reflection?: string;
  tags?: string[];
  duration?: number;
};

export type PDPGoal = {
  id: string;
  user_id?: string;
  title: string;
  timeline: string;
  activities: string[];
  created_at?: string;
};

export type ChatHistoryItem = {
  id: string;
  conversation_id?: string;
  question: string;
  answer?: string;
  created_at: string;
};

export type ChatConversation = {
  conversation_id: string;
  first_question: string;
  last_active: string;
};

export type UsagePeriod = "daily" | "monthly" | "yearly";
