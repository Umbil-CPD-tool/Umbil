export type ProProfile = {
  is_pro: boolean | null;
  subscription_status: string | null;
};

export type ProAccessBreakdown = {
  usingPro: number;
  paying: number;
  trialing: number;
  complimentary: number;
};

const isPayingStatus = (status: string | null): boolean => status === "active" || status === "past_due";

/**
 * People who can use Pro right now.
 * Paying and trial prefer Stripe, because checkout first saves a trial as active.
 * Complimentary is Pro switched on with no current paid or trial subscription.
 */
export const countProAccess = (
  profiles: ProProfile[],
  stripe?: { paying: number; trialing: number } | null
): ProAccessBreakdown => {
  const flagged = profiles.filter((row) => row.is_pro === true);
  const dbPaying = flagged.filter((row) => isPayingStatus(row.subscription_status)).length;
  const dbTrialing = flagged.filter((row) => row.subscription_status === "trialing").length;
  const paying = stripe ? stripe.paying : dbPaying;
  const trialing = stripe ? stripe.trialing : dbTrialing;
  const usingPro = Math.max(flagged.length, paying + trialing);
  const complimentary = Math.max(0, flagged.length - paying - trialing);
  return { usingPro, paying, trialing, complimentary };
};
