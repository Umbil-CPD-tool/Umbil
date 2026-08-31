import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appStorage } from "@/lib/appStorage";
import { useTheme } from "@/providers/ThemeProvider";
import type { ColorPalette } from "@/theme/colors";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const TOUR_KEY = "umbil_quick_tour_seen";

type IconName = keyof typeof Ionicons.glyphMap;

type PreviewId =
  | "ask"
  | "styles"
  | "tools"
  | "capture"
  | "reflect"
  | "pdp"
  | "analytics"
  | "appraisals"
  | "done";

type TourStep = {
  title: string;
  body: string;
  icon: IconName;
  preview: PreviewId;
};

const STEPS: TourStep[] = [
  {
    title: "Ask Umbil anything",
    body: "Type clinical questions in plain English — dosages, guidelines, red flags, or reflective prompts. Umbil gives evidence-based answers in seconds.",
    icon: "chatbubbles-outline",
    preview: "ask",
  },
  {
    title: "Choose your depth",
    body: "Switch between Standard, Clinic, and Deep Dive to match the moment — a quick ward answer or a detailed evidence review for study.",
    icon: "options-outline",
    preview: "styles",
  },
  {
    title: "Tools for the busy clinician",
    body: "Open Tools for referral letters, SBAR handovers, safety-netting advice, discharge summaries, and patient handouts — built to speed up documentation.",
    icon: "construct-outline",
    preview: "tools",
  },
  {
    title: "Log your learning",
    body: "Tap Capture learning on any answer to save it to your Learning Log. It keeps your streak alive and builds your CPD portfolio automatically.",
    icon: "book-outline",
    preview: "capture",
  },
  {
    title: "Reflect — in any language",
    body: "Let AI draft a structured reflection, or write your own notes in your native language and translate them for your appraisal. Add tags to keep things organised.",
    icon: "language-outline",
    preview: "reflect",
  },
  {
    title: "Automated PDP goals",
    body: "Umbil watches your tags in the background. Log the same topic enough times (like Asthma) and we'll automatically suggest a Personal Development Plan goal.",
    icon: "flag-outline",
    preview: "pdp",
  },
  {
    title: "See your progress",
    body: "Analytics turns your learning into charts — GMC domain coverage, top clinical topics, and a streak heatmap so you can see your consistency at a glance.",
    icon: "stats-chart-outline",
    preview: "analytics",
  },
  {
    title: "Appraisals, sorted",
    body: "The Appraisals tab holds your PDP, Patient Satisfaction Questionnaires (PSQ), and Colleague Feedback (MSF) — everything you need for revalidation in one place.",
    icon: "clipboard-outline",
    preview: "appraisals",
  },
  {
    title: "You're all set!",
    body: "That's the tour. Revisit it anytime from the menu under Quick Tour. Happy learning!",
    icon: "checkmark-circle-outline",
    preview: "done",
  },
];

/** Tiny illustrative mock-ups of the real screens, purely built from RN primitives (no images/assets). */
const TourPreview = ({ id, colors }: { id: PreviewId; colors: ColorPalette }) => {
  switch (id) {
    case "ask":
      return (
        <View style={{ gap: 8, width: "100%" }}>
          <View
            style={[
              previewStyles.bubble,
              previewStyles.bubbleRight,
              { backgroundColor: colors.primary },
            ]}
          >
            <View style={[previewStyles.line, { width: 92, backgroundColor: "#ffffff99" }]} />
          </View>
          <View
            style={[
              previewStyles.bubble,
              previewStyles.bubbleLeft,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 },
            ]}
          >
            <View style={[previewStyles.line, { width: 118, backgroundColor: colors.textMuted }]} />
            <View style={[previewStyles.line, { width: 70, backgroundColor: colors.textMuted, marginTop: 5 }]} />
          </View>
        </View>
      );
    case "styles":
      return (
        <View style={previewStyles.row}>
          {["Standard", "Clinic", "Deep Dive"].map((label, i) => (
            <View
              key={label}
              style={[
                previewStyles.pill,
                i === 1
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 },
              ]}
            >
              <Text
                style={{
                  fontFamily: fonts.semiBold,
                  fontSize: 10,
                  color: i === 1 ? "#fff" : colors.textMuted,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      );
    case "tools":
      return (
        <View style={previewStyles.grid}>
          {(
            [
              ["document-text-outline", "Referral"],
              ["medkit-outline", "SBAR"],
              ["shield-checkmark-outline", "Safety-net"],
              ["newspaper-outline", "Handout"],
            ] as [IconName, string][]
          ).map(([icon, label]) => (
            <View
              key={label}
              style={[previewStyles.gridItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            >
              <Ionicons name={icon} size={14} color={colors.primary} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 9, color: colors.textMuted }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      );
    case "capture":
      return (
        <View
          style={[previewStyles.wideCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={[previewStyles.flameBadge, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="flame" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>
              12-day streak
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted }}>
              Logged today ✓
            </Text>
          </View>
        </View>
      );
    case "reflect":
      return (
        <View style={previewStyles.row}>
          <View
            style={[previewStyles.langChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.text }}>EN</Text>
          </View>
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
          <View
            style={[previewStyles.langChip, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.primary }}>ES</Text>
          </View>
        </View>
      );
    case "pdp":
      return (
        <View
          style={[previewStyles.wideCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={[previewStyles.flameBadge, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="flag" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>
              Asthma × 7 logs
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted }}>
              Goal suggested for you
            </Text>
          </View>
        </View>
      );
    case "analytics":
      return (
        <View style={previewStyles.chartRow}>
          {[18, 30, 22, 38, 26].map((h, i) => (
            <View
              key={i}
              style={[
                previewStyles.bar,
                { height: h, backgroundColor: i === 3 ? colors.primary : colors.primaryMuted },
              ]}
            />
          ))}
        </View>
      );
    case "appraisals":
      return (
        <View style={previewStyles.row}>
          {["PDP", "PSQ", "MSF"].map((label) => (
            <View
              key={label}
              style={[previewStyles.badge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.text }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      );
    case "done":
    default:
      return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="sparkles" size={30} color={colors.primary} />
        </View>
      );
  }
};

export const QuickTourModal = ({ forceOpen = false }: { forceOpen?: boolean }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    void appStorage.getItem(TOUR_KEY).then((seen) => {
      if (!seen) setOpen(true);
    });
  }, [forceOpen]);

  const finish = () => {
    setOpen(false);
    void appStorage.setItem(TOUR_KEY, "1");
  };

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <Modal visible={open} transparent animationType="fade">
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, spacing.lg),
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              Quick Tour
            </Text>
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === step
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: "transparent", borderColor: colors.border },
                  ]}
                />
              ))}
            </View>
          </View>

          <View
            style={[
              styles.previewFrame,
              { backgroundColor: colors.hoverBg, borderColor: colors.cardBorder },
            ]}
          >
            <View
              style={[styles.previewIconBadge, { backgroundColor: colors.primaryMuted }]}
            >
              <Ionicons name={current.icon} size={16} color={colors.primary} />
            </View>
            <TourPreview id={current.preview} colors={colors} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {current.title}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {current.body}
          </Text>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {!isFirst ? (
                <Pressable
                  onPress={() => setStep((s) => Math.max(0, s - 1))}
                  hitSlop={8}
                  style={[styles.backBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.backText, { color: colors.text }]}>
                    Back
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.footerRight}>
              <Pressable onPress={finish} hitSlop={12} style={styles.skipBtn}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.semiBold }}>
                  Skip
                </Text>
              </Pressable>
              <Pressable
                style={[styles.next, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (isLast) finish();
                  else setStep((s) => s + 1);
                }}
              >
                <Text style={styles.nextText}>{isLast ? "Got it" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const resetQuickTour = async () => {
  await appStorage.deleteItem(TOUR_KEY);
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
  },
  previewFrame: {
    width: "100%",
    minHeight: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  previewIconBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.bold, fontSize: 22, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  footer: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: { flex: 1, alignItems: "flex-start" },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  skipBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  backBtn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  backText: { fontFamily: fonts.semiBold, fontSize: 14 },
  next: {
    borderRadius: radii.sm,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  nextText: { color: "#fff", fontFamily: fonts.bold },
});

const previewStyles = StyleSheet.create({
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: "78%",
  },
  bubbleRight: { alignSelf: "flex-end" },
  bubbleLeft: { alignSelf: "flex-start" },
  line: { height: 6, borderRadius: 3, opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  gridItem: {
    width: 62,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  wideCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  flameBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  langChip: {
    width: 40,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 44,
  },
  bar: { width: 14, borderRadius: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
