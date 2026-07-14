export type UmbilProfile = {
  id: string;
  email: string | null;
  academic_email: string | null;
  full_name: string | null;
  grade: string | null;
  custom_instructions: string | null;
  is_pro: boolean;
  subscription_status: string | null;
  plan_type: string | null;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sourceQuestion?: string;
};

export type AnswerStyle = 'clinic' | 'standard' | 'deepDive';
