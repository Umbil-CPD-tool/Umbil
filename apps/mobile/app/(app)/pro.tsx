import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getUserStats,
  isNoBillingProfileError,
  NO_STRIPE_BILLING_MESSAGE,
  openBillingPortal,
  openExternalUrl,
  startCheckout,
} from "@/lib/api";
import { getMyProfile } from "@/lib/profile";
import { useTheme } from "@/providers/ThemeProvider";
import type { ColorPalette } from "@/theme/colors";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";
import { useCenteredContentStyle } from "@/components/ScreenSafe";

const STRIPE_PRICES = {
  pro_monthly: "price_1TgCHkEwbwdYfgj4xSqguUmo",
  pro_annual: "price_1TgCHkEwbwdYfgj4x4ytPO05",
  team_monthly: "price_1TgCIBEwbwdYfgj4ie6nH1m2",
  team_annual: "price_1TgCJBEwbwdYfgj4MWPA4Sk0",
} as const;

type PlanTier = "pro" | "team";

const STAT_BLUE = "#3b82f6";
const STAT_BLUE_MUTED = "rgba(59, 130, 246, 0.12)";
const STAT_PURPLE = "#a855f7";
const STAT_PURPLE_MUTED = "rgba(168, 85, 247, 0.12)";

const FREE_FEATURES: { label: string; boldWord?: string; included: boolean }[] =
  [
    { label: "Standard Clinical Q&A", included: true },
    { label: "Capture Learning logs / month", boldWord: "10", included: true },
    { label: "Tool generations / month", boldWord: "5", included: true },
    { label: "Appraisal-Ready Patient Feedback", included: false },
    { label: "Appraisal-Ready Colleague Feedback", included: false },
    { label: "Automated PDP Goal Generation", included: false },
  ];

const PRO_CHECK_FEATURES_TOP = [
  "Unlimited Capture Learning logs & reflection prompts",
  "Unlimited clinical tool usage (Referrals, Info, Translation)",
];

const PRO_HIGHLIGHT_FEATURES = [
  "Appraisal-Ready Patient Feedback (PSQ) Reports",
  "Appraisal-Ready Colleague Feedback (MSF) Reports",
];

const PRO_CHECK_FEATURES_BOTTOM = [
  "Automated Personal Development Plan (PDP) Generation",
  "Trusted UK guideline-aligned clinical support",
];

const ProScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const contentStyle = useCenteredContentStyle();

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [checkingOutTier, setCheckingOutTier] = useState<PlanTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const [stats, setStats] = useState({ questions: 0, tools: 0, captures: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    void getMyProfile()
      .then((p) => {
        setIsPro(!!p?.is_pro || p?.subscription_status === "active");
        setHasStripeCustomer(!!p?.stripe_customer_id?.trim());
      })
      .finally(() => setCheckingStatus(false));
  }, []);

  useEffect(() => {
    if (!isPro) return;
    let active = true;
    setStatsLoading(true);
    void getUserStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err) => {
        console.error("Failed to load stats", err);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isPro]);

  const checkout = async (tier: PlanTier) => {
    setCheckingOutTier(tier);
    try {
      const priceId = annual
        ? STRIPE_PRICES[`${tier}_annual`]
        : STRIPE_PRICES[`${tier}_monthly`];
      const planType = `${tier}_${annual ? "annual" : "monthly"}`;
      const { url } = await startCheckout(priceId, planType);
      if (!url) throw new Error("No checkout URL");
      await openExternalUrl(url);
    } catch (err) {
      Alert.alert(
        "Checkout error",
        err instanceof Error ? err.message : "Something went wrong initiating checkout."
      );
    } finally {
      setCheckingOutTier(null);
    }
  };

  const portal = async () => {
    if (!hasStripeCustomer) {
      Alert.alert("Subscription", NO_STRIPE_BILLING_MESSAGE);
      return;
    }
    setPortalLoading(true);
    try {
      const { url } = await openBillingPortal();
      if (!url) throw new Error("Could not open billing portal.");
      await openExternalUrl(url);
    } catch (err) {
      if (isNoBillingProfileError(err)) {
        Alert.alert("Subscription", NO_STRIPE_BILLING_MESSAGE);
      } else {
        Alert.alert(
          "Billing error",
          err instanceof Error ? err.message : "Something went wrong."
        );
      }
    } finally {
      setPortalLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Umbil Pro",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
          }}
        />
        <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Umbil Pro",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: fonts.semiBold,
            color: colors.text,
          },
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, contentStyle]}
      >
        {isPro ? (
          <>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={36} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Thank you for being a Pro!</Text>
            <Text style={styles.heroSubtitle}>
              Your account is fully upgraded. Here is a look at your clinical
              impact so far.
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: STAT_BLUE_MUTED }]}
                >
                  <Ionicons name="chatbox-outline" size={22} color={STAT_BLUE} />
                </View>
                <Text style={styles.statLabel}>Questions Asked</Text>
                <Text style={styles.statValue}>
                  {statsLoading ? "..." : stats.questions}
                </Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: colors.primaryMuted },
                  ]}
                >
                  <Feather name="activity" size={22} color={colors.primary} />
                </View>
                <Text style={styles.statLabel}>Tools Generated</Text>
                <Text style={styles.statValue}>
                  {statsLoading ? "..." : stats.tools}
                </Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: STAT_PURPLE_MUTED },
                  ]}
                >
                  <Feather name="target" size={22} color={STAT_PURPLE} />
                </View>
                <Text style={styles.statLabel}>Learning Captured</Text>
                <Text style={styles.statValue}>
                  {statsLoading ? "..." : stats.captures}
                </Text>
              </View>
            </View>

            {hasStripeCustomer ? (
              <Pressable
                style={[styles.manageBtn, portalLoading && { opacity: 0.6 }]}
                onPress={() => void portal()}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={20} color={colors.primary} />
                    <Text style={styles.manageBtnText}>
                      Manage Subscription & Billing
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View style={styles.billingNote}>
                <Text style={styles.billingNoteText}>
                  {NO_STRIPE_BILLING_MESSAGE}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.title}>
              Capture learning as you work.{"\n"}Stay appraisal ready all year.
            </Text>
            <Text style={styles.body}>
              You’re already using Umbil to answer clinical questions, write
              referrals and support patient care. Umbil Pro helps you capture
              that learning in real time, turning everyday clinical work into
              meaningful appraisal evidence without the end-of-year scramble.
            </Text>

            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                <Text style={styles.infoBannerBold}>Did you know? </Text>
                Doctors can spend up to 80 hours each year preparing for
                appraisal and revalidation. Umbil helps capture learning as it
                happens, reducing the need for retrospective portfolio
                building.
              </Text>
            </View>

            <Text style={styles.pricingHeading}>Pricing</Text>
            <Text style={styles.pricingIntro}>
              Choose the plan that works for you or your team. Whether you’re
              a medical student, trainee, GP, nurse, pharmacist, ANP or
              consultant, Umbil helps you answer clinical questions, reduce
              admin, capture learning and prepare for appraisal, all within a
              single platform.
            </Text>

            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setAnnual(false)}
                style={[styles.chip, !annual && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, !annual && styles.chipTextActive]}
                >
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAnnual(true)}
                style={[styles.chip, annual && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, annual && styles.chipTextActive]}
                >
                  Annually
                </Text>
                <View style={styles.saveTag}>
                  <Text style={styles.saveTagText}>SAVE UP TO 31%</Text>
                </View>
              </Pressable>
            </View>

            {/* TIER 0: FREE */}
            <View style={styles.planCard}>
              <View style={styles.planHeaderRow}>
                <View>
                  <Text style={styles.planName}>Free</Text>
                  <Text style={styles.planTag}>Explore Umbil for free</Text>
                </View>
                <View style={[styles.planIconWrap, { backgroundColor: colors.hoverBg }]}>
                  <Ionicons name="person" size={26} color={colors.textMuted} />
                </View>
              </View>

              <Text style={styles.planDescription}>
                Perfect for trying out Umbil's core medical knowledge base
                before committing to a full clinical workflow tool.
              </Text>

              <View style={styles.priceBlock}>
                <Text style={styles.price}>£0</Text>
                <Text style={styles.priceHint}>Forever free</Text>
              </View>

              <View style={[styles.btn, styles.btnDisabled]}>
                <Text style={styles.btnDisabledText}>Your Current Plan</Text>
              </View>

              <View style={styles.featureList}>
                {FREE_FEATURES.map((feature) => (
                  <View key={feature.label} style={styles.featureRow}>
                    <Ionicons
                      name={feature.included ? "checkmark" : "close"}
                      size={18}
                      color={feature.included ? colors.textMuted : colors.danger}
                      style={styles.featureIcon}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        !feature.included && styles.featureTextExcluded,
                      ]}
                    >
                      {feature.boldWord ? (
                        <>
                          <Text style={styles.featureTextBold}>
                            {feature.boldWord}
                          </Text>{" "}
                          {feature.label}
                        </>
                      ) : (
                        feature.label
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* TIER 1: UMBIL PRO (HERO) */}
            <View style={[styles.planCard, styles.proCard]}>
              <View style={styles.proCardStripe} />
              <View style={styles.planHeaderRow}>
                <View>
                  <Text style={styles.planName}>Umbil Pro</Text>
                  <Text style={styles.planTag}>For individual clinicians</Text>
                </View>
                <View style={[styles.planIconWrap, { backgroundColor: colors.primaryMuted }]}>
                  <FontAwesome5 name="stethoscope" size={22} color={colors.primary} />
                </View>
              </View>

              <Text style={styles.planDescription}>
                Everything you need to support clinical practice, learning,
                appraisal and professional development with zero limits.
              </Text>

              <View style={styles.priceBlock}>
                {annual ? (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>£200</Text>
                      <Text style={styles.priceUnit}>/year</Text>
                    </View>
                    <Text style={styles.priceHintDark}>
                      Just £16.67/month billed annually
                    </Text>
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>
                        Save £88 every year (31%)
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>£24</Text>
                    <Text style={styles.priceUnit}>/month</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={[
                  styles.btn,
                  { backgroundColor: colors.primary },
                  checkingOutTier === "pro" && { opacity: 0.6 },
                ]}
                onPress={() => void checkout("pro")}
                disabled={checkingOutTier !== null}
              >
                {checkingOutTier === "pro" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Subscribe to Pro</Text>
                )}
              </Pressable>

              <Text style={styles.unlocksLabel}>Unlocks everything:</Text>
              <View style={styles.featureList}>
                {PRO_CHECK_FEATURES_TOP.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                      style={styles.featureIcon}
                    />
                    <Text style={styles.featureTextBoldItem}>{feature}</Text>
                  </View>
                ))}
                {PRO_HIGHLIGHT_FEATURES.map((feature) => (
                  <View
                    key={feature}
                    style={[styles.featureRow, styles.featureRowHighlight]}
                  >
                    <Feather
                      name="activity"
                      size={18}
                      color={colors.primary}
                      style={styles.featureIcon}
                    />
                    <Text style={styles.featureTextHighlight}>{feature}</Text>
                  </View>
                ))}
                {PRO_CHECK_FEATURES_BOTTOM.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primary}
                      style={styles.featureIcon}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* TIER 2: UMBIL TEAM */}
            <View style={styles.planCard}>
              <View style={styles.planHeaderRow}>
                <View>
                  <Text style={styles.planName}>Umbil Team</Text>
                  <Text style={styles.planTag}>Up to 10 clinicians</Text>
                </View>
                <View style={[styles.planIconWrap, { backgroundColor: STAT_BLUE_MUTED }]}>
                  <Ionicons name="people" size={24} color={STAT_BLUE} />
                </View>
              </View>

              <Text style={styles.planDescription}>
                Provide Umbil Pro access to up to 10 clinicians under one
                subscription. Ideal for GP practices, training practices, and
                multidisciplinary teams.
              </Text>

              <View style={styles.priceBlock}>
                {annual ? (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>£1,899</Text>
                      <Text style={styles.priceUnit}>/year</Text>
                    </View>
                    <Text style={styles.priceHintDark}>
                      As little as £15.83 per clinician/month
                    </Text>
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>
                        Save £489 every year (20%)
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>£199</Text>
                    <Text style={styles.priceUnit}>/month</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={[
                  styles.btn,
                  { backgroundColor: colors.text },
                  checkingOutTier === "team" && { opacity: 0.6 },
                ]}
                onPress={() => void checkout("team")}
                disabled={checkingOutTier !== null}
              >
                {checkingOutTier === "team" ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text
                    style={[styles.btnText, { color: colors.background }]}
                  >
                    Setup Team Plan
                  </Text>
                )}
              </Pressable>

              <View style={styles.conciergeCard}>
                <View style={styles.conciergeTitleRow}>
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                  <Text style={styles.conciergeTitle}>
                    Simple Concierge Setup
                  </Text>
                </View>
                <Text style={styles.conciergeCopy}>
                  After subscribing, simply provide us the names and email
                  addresses of the clinicians you would like to include. We’ll
                  manually activate Umbil Pro access for each user ensuring
                  your team is onboarded smoothly.
                </Text>
              </View>

              <View style={styles.featureList}>
                <View style={styles.featureRow}>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={colors.primary}
                    style={styles.featureIcon}
                  />
                  <Text style={styles.featureTextBoldItem}>
                    Includes everything in Umbil Pro for up to 10 clinicians.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.studentBanner}>
              <FontAwesome5
                name="graduation-cap"
                size={26}
                color={colors.primary}
                style={styles.studentBannerIcon}
              />
              <Text style={styles.studentBannerText}>
                <Text style={styles.studentBannerBold}>
                  Medical, nursing and healthcare students
                </Text>{" "}
                get Umbil free with a verified{" "}
                <Text style={styles.studentBannerAcuk}>.ac.uk</Text> email.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
};

export default ProScreen;

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.lg },
    loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center" },

    // Pro dashboard
    heroBadge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: spacing.lg,
    },
    heroTitle: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    heroSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
    statsGrid: { gap: spacing.md, marginBottom: spacing.xl },
    statCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: "center",
    },
    statIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    statLabel: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.textMuted,
      marginBottom: 4,
    },
    statValue: {
      fontFamily: fonts.bold,
      fontSize: 34,
      color: colors.text,
    },
    manageBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignSelf: "center",
    },
    manageBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
    billingNote: {
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    billingNoteText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center",
    },

    // Pricing intro
    title: {
      fontFamily: fonts.bold,
      fontSize: 26,
      lineHeight: 32,
      color: colors.text,
      marginBottom: spacing.md,
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    infoBanner: {
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.xl,
    },
    infoBannerText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    infoBannerBold: { fontFamily: fonts.bold, color: colors.primary },

    pricingHeading: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    pricingIntro: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },

    // Toggle
    toggleRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: spacing.xl,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: 4,
      alignSelf: "flex-start",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chipActive: { backgroundColor: colors.surface },
    chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
    chipTextActive: { color: colors.text },
    saveTag: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    saveTagText: {
      fontFamily: fonts.bold,
      fontSize: 9,
      letterSpacing: 0.4,
      color: colors.primary,
    },

    // Plan cards
    planCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    proCard: {
      borderWidth: 2,
      borderColor: colors.primary,
      overflow: "hidden",
    },
    proCardStripe: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 5,
      backgroundColor: colors.primary,
    },
    planHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.md,
    },
    planName: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.text,
      marginBottom: 4,
    },
    planTag: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
    planIconWrap: {
      width: 48,
      height: 48,
      borderRadius: radii.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    planDescription: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    priceBlock: { marginBottom: spacing.md },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    price: { fontFamily: fonts.bold, fontSize: 38, color: colors.text },
    priceUnit: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
    priceHint: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
    priceHintDark: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.text,
      marginTop: 4,
    },
    saveBadge: {
      backgroundColor: colors.successMuted,
      borderRadius: radii.sm,
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 8,
    },
    saveBadgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },

    btn: {
      borderRadius: radii.lg,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: spacing.md,
    },
    btnText: { fontFamily: fonts.bold, fontSize: 15, color: "#fff" },
    btnDisabled: { backgroundColor: colors.hoverBg, borderWidth: 1, borderColor: colors.border },
    btnDisabledText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted },

    unlocksLabel: {
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.primary,
      marginBottom: spacing.sm,
    },
    featureList: { gap: spacing.sm },
    featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    featureRowHighlight: {
      backgroundColor: colors.primaryMuted,
      borderRadius: radii.sm,
      padding: 8,
      marginHorizontal: -8,
    },
    featureIcon: { marginTop: 1 },
    featureText: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    featureTextBoldItem: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    featureTextHighlight: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    featureTextExcluded: {
      color: colors.textMuted,
      textDecorationLine: "line-through",
    },
    featureTextBold: { fontFamily: fonts.bold, color: colors.text },

    conciergeCard: {
      backgroundColor: colors.hoverBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    conciergeTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    conciergeTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
    conciergeCopy: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },

    studentBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    studentBannerIcon: { flexShrink: 0 },
    studentBannerText: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    studentBannerBold: { fontFamily: fonts.bold, color: colors.text },
    studentBannerAcuk: { fontFamily: fonts.bold, color: colors.primary },
  });
