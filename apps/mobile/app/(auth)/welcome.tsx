import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui";
import { getPublicEnv } from "@/lib/env";
import { colors, radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const TRUST_ITEMS = [
  { icon: "shield-checkmark-outline" as const, label: "GDPR Compliant" },
  { icon: "checkmark-circle-outline" as const, label: "NICE · SIGN · BNF" },
  { icon: "medkit-outline" as const, label: "Built by UK Doctors" },
];

const TOOLS = [
  {
    icon: "document-text-outline" as const,
    tint: "#2563eb",
    tintBg: "#eff6ff",
    title: "Referral Writer",
    desc: "Rough notes → consultant-ready letters in seconds.",
  },
  {
    icon: "shield-outline" as const,
    tint: "#dc2626",
    tintBg: "#fef2f2",
    title: "Safety Net",
    desc: "Robust discharge advice and red flags for your patient.",
  },
  {
    icon: "pulse-outline" as const,
    tint: "#d97706",
    tintBg: "#fffbeb",
    title: "SBAR Handover",
    desc: "Turn messy ward events into a clear SBAR for urgent calls.",
  },
  {
    icon: "language-outline" as const,
    tint: "#7c3aed",
    tintBg: "#f5f3ff",
    title: "Translator",
    desc: "Simplify jargon into patient-friendly language.",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { apiUrl } = getPublicEnv();
  const insets = useSafeAreaInsets();

  const openWeb = (path: string) => {
    const root = apiUrl.replace(/\/$/, "") || "https://umbil.ai";
    void Linking.openURL(`${root}${path}`);
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        // Clears notches/camera cutouts while keeping the same visual gap
        // below the safe area that the web version gets from the browser chrome.
        { paddingTop: insets.top + spacing.lg },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <BrandMark showImage size="auth" />

      <View style={styles.badge}>
        <Ionicons name="star" size={12} color={colors.primary} />
        <Text style={styles.badgeText}>Designed for real clinical practice</Text>
      </View>

      <Text style={styles.hero}>
        Clinical answers{"\n"}
        <Text style={styles.heroAccent}>in seconds.</Text>
      </Text>

      <Text style={styles.subhead}>
        Ask complex questions in plain English. Get structured summaries
        sourced strictly from national clinical guidelines.
      </Text>

      <View style={styles.ctaGroup}>
        <Button
          label="Get Started — It's Free"
          onPress={() =>
            router.push({
              pathname: "/(auth)/sign-in",
              params: { mode: "signUp" },
            })
          }
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </View>

      <View style={styles.trustRow}>
        {TRUST_ITEMS.map((item) => (
          <View key={item.label} style={styles.trustItem}>
            <Ionicons name={item.icon} size={15} color={colors.primary} />
            <Text style={styles.trustText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Everything you need on the ward</Text>
      <Text style={styles.sectionSubtitle}>
        Beyond Q&A — purpose-built tools for daily clinical tasks.
      </Text>

      <View style={styles.toolGrid}>
        {TOOLS.map((tool) => (
          <View key={tool.title} style={styles.toolCard}>
            <View style={[styles.toolIcon, { backgroundColor: tool.tintBg }]}>
              <Ionicons name={tool.icon} size={20} color={tool.tint} />
            </View>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDesc}>{tool.desc}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cpdCard}>
        <View style={styles.cpdBadge}>
          <Text style={styles.cpdBadgeText}>AUTOMATED CPD</Text>
        </View>
        <Text style={styles.cpdTitle}>
          Evidence your learning, without the paperwork
        </Text>
        <Text style={styles.cpdDesc}>
          Umbil passively suggests learning points from your cases. Log them
          to your portfolio with one tap.
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.success} />
          <Text style={styles.footerText}>
            We never store patient identifiers — queries are anonymised.
          </Text>
        </View>
        <Text style={styles.disclaimer}>
          Umbil is an AI clinical assistant. It does not replace professional
          medical judgment. Always verify outputs against official guidelines.
        </Text>
        <View style={styles.legalRow}>
          <Text style={styles.link} onPress={() => openWeb("/privacy")}>
            Privacy Policy
          </Text>
          <Text style={styles.legalDivider}> · </Text>
          <Text style={styles.link} onPress={() => openWeb("/terms")}>
            Terms of Use
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  hero: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  heroAccent: {
    color: colors.primary,
  },
  subhead: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  ctaGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  toolCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  toolTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  toolDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  cpdCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  cpdBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  cpdBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.4,
  },
  cpdTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cpdDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  footer: {
    alignItems: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  legalRow: {
    flexDirection: "row",
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  legalDivider: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
