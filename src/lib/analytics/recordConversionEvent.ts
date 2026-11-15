import { supabaseService } from "@/lib/supabaseService";
import {
  clinicianGradeLabel,
  clipLabel,
  parseChannel,
  usageTierFromQuestionCount,
  type ConversionEventType,
  type LimitSurface,
} from "./conversionFunnel";

export type ConversionEventInput = {
  userId: string | null;
  eventType: ConversionEventType;
  surface: LimitSurface | "pricing" | "billing";
  feature?: string | null;
  source?: string | null;
  planType?: string | null;
  channel?: string | null;
  mrrPence?: number | null;
  listMrrPence?: number | null;
  stripeEventId?: string | null;
  stripeSubscriptionId?: string | null;
  duringTrial?: boolean;
  limit?: number | null;
  period?: string | null;
  grade?: string | null;
};

const money = (value: number | null | undefined): number | null => {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
};

const alreadyRecorded = async (
  eventType: ConversionEventType,
  key: "stripe_event_id" | "stripe_subscription_id",
  value: string
): Promise<boolean> => {
  const { data, error } = await supabaseService
    .from("app_analytics")
    .select("id")
    .eq("event_type", eventType)
    .filter(`metadata->>${key}`, "eq", value)
    .limit(1);
  if (error) {
    console.error("[Umbil] Conversion lookup failed:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
};

const loadContext = async (
  userId: string | null,
  knownGrade: string | null | undefined
): Promise<{ grade: string; usageTier: string }> => {
  if (!userId) {
    return { grade: "Guest", usageTier: "guest" };
  }

  const gradePromise =
    knownGrade !== undefined
      ? Promise.resolve(knownGrade)
      : supabaseService
          .from("profiles")
          .select("grade")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) console.error("[Umbil] Grade lookup failed:", error.message);
            return (data?.grade as string | null | undefined) ?? null;
          });

  const countPromise = supabaseService
    .from("app_analytics")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "question_asked")
    .then(({ count, error }) => {
      if (error) {
        console.error("[Umbil] Usage tier lookup failed:", error.message);
        return null;
      }
      return count ?? 0;
    });

  const [grade, questionCount] = await Promise.all([gradePromise, countPromise]);
  return {
    grade: clinicianGradeLabel(grade, true),
    usageTier: questionCount == null ? "unknown" : usageTierFromQuestionCount(questionCount, true),
  };
};

/** Writes one upgrade-journey event. Failures are logged and never thrown. */
export const recordConversionEvent = async (input: ConversionEventInput): Promise<void> => {
  try {
    if (input.stripeEventId) {
      const seen = await alreadyRecorded(input.eventType, "stripe_event_id", input.stripeEventId);
      if (seen) return;
    }
    if (
      input.stripeSubscriptionId &&
      (input.eventType === "trial_started" || input.eventType === "subscribed" || input.eventType === "cancelled")
    ) {
      const seen = await alreadyRecorded(input.eventType, "stripe_subscription_id", input.stripeSubscriptionId);
      if (seen) return;
    }

    const context = await loadContext(input.userId, input.grade);
    const metadata: Record<string, string | number | boolean> = {
      surface: input.surface,
      grade: context.grade,
      usage_tier: context.usageTier,
    };
    const feature = clipLabel(input.feature, 40);
    const source = clipLabel(input.source, 40);
    const planType = clipLabel(input.planType, 40);
    const channel = parseChannel(input.channel);
    const mrrPence = money(input.mrrPence);
    const listMrrPence = money(input.listMrrPence);
    if (feature) metadata.feature = feature;
    if (source) metadata.source = source;
    if (planType) metadata.plan_type = planType;
    if (channel) metadata.channel = channel;
    if (mrrPence != null) metadata.mrr_pence = mrrPence;
    if (listMrrPence != null) metadata.list_mrr_pence = listMrrPence;
    if (input.stripeEventId) metadata.stripe_event_id = input.stripeEventId;
    if (input.stripeSubscriptionId) metadata.stripe_subscription_id = input.stripeSubscriptionId;
    if (input.duringTrial != null) metadata.during_trial = input.duringTrial;
    if (input.limit != null && Number.isFinite(input.limit)) metadata.limit = input.limit;
    if (input.period) metadata.period = input.period;

    const { error } = await supabaseService.from("app_analytics").insert({
      user_id: input.userId,
      event_type: input.eventType,
      metadata,
    });
    if (error && error.code !== "23505") {
      console.error("[Umbil] Conversion event insert failed:", error.message);
    }
  } catch (error) {
    console.error("[Umbil] Conversion event failed:", error instanceof Error ? error.message : error);
  }
};

export const markFreeLimitsChanged = async (): Promise<{ limitsChangedAt: string; alreadySet: boolean }> => {
  const { data, error } = await supabaseService
    .from("analytics_conversion_baseline")
    .select("limits_changed_at")
    .eq("id", "free_limits")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Baseline row is missing");
  if (data.limits_changed_at) {
    return { limitsChangedAt: data.limits_changed_at as string, alreadySet: true };
  }
  const { data: updated, error: updateError } = await supabaseService
    .from("analytics_conversion_baseline")
    .update({ limits_changed_at: new Date().toISOString() })
    .eq("id", "free_limits")
    .is("limits_changed_at", null)
    .select("limits_changed_at")
    .single();
  if (updateError) throw new Error(updateError.message);
  return { limitsChangedAt: updated.limits_changed_at as string, alreadySet: false };
};
