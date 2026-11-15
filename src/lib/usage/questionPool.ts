import {
  CPD_USAGE_FEATURE,
  FREE_CPD_LIMIT,
  FREE_QUESTION_LIMIT,
  FREE_TOOL_LIMIT,
  QUESTION_USAGE_FEATURE,
  QUESTION_USAGE_FEATURES,
  TOOL_USAGE_FEATURE,
  questionIncrementRoom,
  remainingOf,
  summedMonthlyUsage,
  type UsageCountRow,
} from "@umbil/shared";
import { checkAndTrackUsage, hasUnlimitedAccess, type ProfileAccess } from "@/lib/store/usage";

type UsageClient = Parameters<typeof checkAndTrackUsage>[4];

export const trackPooledQuestions = async (
  userId: string,
  access: ProfileAccess,
  client?: UsageClient
): Promise<boolean> => {
  if (hasUnlimitedAccess(access)) return true;
  const db = client;
  if (!db) return false;

  const { data, error } = await db
    .from("usage_tracking")
    .select("feature, usage_count, last_reset_date")
    .eq("user_id", userId)
    .in("feature", [...QUESTION_USAGE_FEATURES]);

  if (error) console.error("Question allowance read failed", error);

  const room = questionIncrementRoom((data ?? []) as UsageCountRow[], new Date());
  if (room <= 0) return false;

  return checkAndTrackUsage(userId, QUESTION_USAGE_FEATURE, room, "monthly", db, access);
};

export type AllowanceBucket = { used: number; limit: number; remaining: number };

export const bucketsFromRows = (rows: readonly UsageCountRow[], now = new Date()) => {
  const questionsUsed = summedMonthlyUsage(rows, QUESTION_USAGE_FEATURES, now);
  const toolsUsed = summedMonthlyUsage(rows, [TOOL_USAGE_FEATURE], now);
  const cpdUsed = summedMonthlyUsage(rows, [CPD_USAGE_FEATURE], now);
  return {
    questions: {
      used: questionsUsed,
      limit: FREE_QUESTION_LIMIT,
      remaining: remainingOf(questionsUsed, FREE_QUESTION_LIMIT),
    },
    tools: {
      used: toolsUsed,
      limit: FREE_TOOL_LIMIT,
      remaining: remainingOf(toolsUsed, FREE_TOOL_LIMIT),
    },
    cpd: {
      used: cpdUsed,
      limit: FREE_CPD_LIMIT,
      remaining: remainingOf(cpdUsed, FREE_CPD_LIMIT),
    },
  };
};
