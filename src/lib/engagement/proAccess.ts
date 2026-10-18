export type ProProfile = {
  is_pro: boolean | null;
  subscription_status: string | null;
  is_admin?: boolean | null;
  email?: string | null;
  academic_email?: string | null;
  stripe_customer_id?: string | null;
};

export type ComplimentaryBreakdown = {
  students: number;
  staff: number;
  friendsAndDoctors: number;
};

export type ProAccessBreakdown = {
  usingPro: number;
  paying: number;
  trialing: number;
  complimentary: number;
  complimentaryBreakdown: ComplimentaryBreakdown;
};

export type StripeAccessCounts = {
  paying: number;
  trialing: number;
  /** Customer ids on a current paying or free-month subscription. Omit when Stripe was not loaded. */
  billedCustomerIds?: readonly string[];
};

const UK_ACADEMIC_EMAIL = /^[^\s@]+@[^\s@]+\.ac\.uk$/i;

const isPayingStatus = (status: string | null): boolean => status === "active" || status === "past_due";

const hasOpenSubscriptionStatus = (status: string | null | undefined): boolean =>
  status === "active" || status === "past_due" || status === "trialing";

/** Same rule as student Pro: a confirmed UK university address. */
const isUkAcademicEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return UK_ACADEMIC_EMAIL.test(email.trim());
};

type ComplimentaryBucket = keyof ComplimentaryBreakdown;

const emptyComplimentary = (): ComplimentaryBreakdown => ({
  students: 0,
  staff: 0,
  friendsAndDoctors: 0,
});

const bucketFor = (profile: ProProfile): ComplimentaryBucket => {
  if (profile.is_admin === true) return "staff";
  if (isUkAcademicEmail(profile.email) || isUkAcademicEmail(profile.academic_email)) return "students";
  return "friendsAndDoctors";
};

const TRIM_ORDER: ComplimentaryBucket[] = ["friendsAndDoctors", "students", "staff"];

const trimBuckets = (counts: ComplimentaryBreakdown, overflow: number): ComplimentaryBreakdown => {
  const next = { ...counts };
  let left = overflow;
  for (const bucket of TRIM_ORDER) {
    if (left <= 0) break;
    const remove = Math.min(next[bucket], left);
    next[bucket] -= remove;
    left -= remove;
  }
  return next;
};

/**
 * Students, staff, and friends must add up to the complimentary total.
 * Stripe customer ids decide who is already paying or on the free month.
 * Without that list, an open subscription status is used instead.
 */
const countComplimentaryBreakdown = (
  flagged: ProProfile[],
  complimentary: number,
  billedCustomerIds: ReadonlySet<string> | null
): ComplimentaryBreakdown => {
  if (complimentary <= 0 || flagged.length === 0) return emptyComplimentary();

  const counts = emptyComplimentary();
  const stillLooksSubscribed = emptyComplimentary();

  for (const profile of flagged) {
    const customerId = profile.stripe_customer_id?.trim() || null;
    const matchedToStripe = Boolean(billedCustomerIds && customerId && billedCustomerIds.has(customerId));
    if (matchedToStripe) continue;
    if (!billedCustomerIds && hasOpenSubscriptionStatus(profile.subscription_status)) continue;

    const bucket = bucketFor(profile);
    counts[bucket] += 1;
    if (billedCustomerIds && hasOpenSubscriptionStatus(profile.subscription_status)) {
      stillLooksSubscribed[bucket] += 1;
    }
  }

  let classified = counts.students + counts.staff + counts.friendsAndDoctors;
  if (classified > complimentary) {
    let overflow = classified - complimentary;
    for (const bucket of TRIM_ORDER) {
      if (overflow <= 0) break;
      const remove = Math.min(stillLooksSubscribed[bucket], counts[bucket], overflow);
      counts[bucket] -= remove;
      overflow -= remove;
    }
    classified = counts.students + counts.staff + counts.friendsAndDoctors;
    if (classified > complimentary) return trimBuckets(counts, classified - complimentary);
  }

  if (classified < complimentary) {
    counts.friendsAndDoctors += complimentary - classified;
  }

  return counts;
};

/**
 * People who can use Pro right now.
 * Paying and trial prefer Stripe, because checkout first saves a trial as active.
 * Complimentary is Pro switched on with no current paid or trial subscription.
 */
export const countProAccess = (
  profiles: ProProfile[],
  stripe?: StripeAccessCounts | null
): ProAccessBreakdown => {
  const flagged = profiles.filter((row) => row.is_pro === true);
  const dbPaying = flagged.filter((row) => isPayingStatus(row.subscription_status)).length;
  const dbTrialing = flagged.filter((row) => row.subscription_status === "trialing").length;
  const paying = stripe ? stripe.paying : dbPaying;
  const trialing = stripe ? stripe.trialing : dbTrialing;
  const usingPro = Math.max(flagged.length, paying + trialing);
  const complimentary = Math.max(0, flagged.length - paying - trialing);
  const billedCustomerIds = stripe && Array.isArray(stripe.billedCustomerIds)
    ? new Set(stripe.billedCustomerIds.filter((id) => id.length > 0))
    : null;
  return {
    usingPro,
    paying,
    trialing,
    complimentary,
    complimentaryBreakdown: countComplimentaryBreakdown(flagged, complimentary, billedCustomerIds),
  };
};
