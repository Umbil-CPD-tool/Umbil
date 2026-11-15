import { supabaseService } from "@/lib/supabaseService";
import { CLINICIAN_TRANSITION_COUPON_ID } from "@/lib/stripePrices";
import { isUkAcademicEmail, type TransitionOffer } from "@umbil/shared";

export type ProNotice = {
  offer: TransitionOffer;
  access_until: string;
};

const OPEN_BILLING = new Set(["active", "trialing", "past_due"]);

export const readProNotice = async (userId: string): Promise<ProNotice | null> => {
  const { data, error } = await supabaseService
    .from("pro_access_notices")
    .select("offer, access_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.access_until) return null;
  if (data.offer !== "student" && data.offer !== "clinician") return null;
  return { offer: data.offer, access_until: data.access_until };
};

/** Ends complimentary Pro once the 14-day notice window has passed. Paying and admin accounts stay. */
export const settleComplimentaryAccess = async (userId: string): Promise<void> => {
  const notice = await readProNotice(userId);
  if (!notice) return;
  if (new Date(notice.access_until).getTime() > Date.now()) return;

  const { data: profile, error } = await supabaseService
    .from("profiles")
    .select("is_pro, is_admin, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.is_pro || profile.is_admin) return;
  if (OPEN_BILLING.has(profile.subscription_status ?? "")) return;

  const { error: updateError } = await supabaseService
    .from("profiles")
    .update({ is_pro: false })
    .eq("id", userId);

  if (updateError) console.error("Failed to end complimentary Pro", updateError);
};

export const canPurchaseStudentPlan = async (userId: string): Promise<boolean> => {
  const [profileResult, authResult, notice] = await Promise.all([
    supabaseService.from("profiles").select("email, academic_email").eq("id", userId).maybeSingle(),
    supabaseService.auth.admin.getUserById(userId),
    readProNotice(userId),
  ]);

  if (notice?.offer === "student") return true;
  const emails = [
    profileResult.data?.email,
    profileResult.data?.academic_email,
    authResult.data.user?.email,
  ];
  return emails.some((email) => isUkAcademicEmail(email));
};

/** Coupon is attached by the server for complimentary clinicians. It is not a public code. */
export const clinicianTransitionCoupon = async (
  userId: string,
  planType: string
): Promise<string | null> => {
  if (planType !== "pro_monthly") return null;
  const notice = await readProNotice(userId);
  if (notice?.offer !== "clinician") return null;

  const { data: profile } = await supabaseService
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
    return null;
  }
  return CLINICIAN_TRANSITION_COUPON_ID;
};
