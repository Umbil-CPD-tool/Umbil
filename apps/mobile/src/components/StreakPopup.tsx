import { activeDaysThisWeek, weekLabel } from "@umbil/shared";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const BRAND_TEAL = "#1fb8cd";
const DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

type Props = {
  isOpen: boolean;
  streakCount: number;
  milestone?: number | null;
  onClose: () => void;
};

export const StreakPopup = ({ isOpen, streakCount, milestone = null, onClose }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { dates } = useCpdStreaks();

  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const activeDays = activeDaysThisWeek(dates.keys(), new Date(), new Date());
  const weekWord = weekLabel(streakCount);
  const title = `${streakCount} ${weekWord === "week" ? "Week" : "Weeks"} Streak!`;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
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
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.fire}>🔥</Text>
            <Text style={styles.number}>{streakCount}</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {milestone ? (
            <View
              style={[
                styles.trophy,
                { backgroundColor: colors.primaryMuted, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={styles.trophyIcon}>🏆</Text>
              <Text style={[styles.trophyText, { color: colors.text }]}>
                Trophy unlocked: {milestone} learning logs
              </Text>
            </View>
          ) : null}
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            You're on fire!{"\n"}
            One learning log a week keeps this going.
          </Text>

          <View style={styles.daysRow}>
            {DAYS.map((d, i) => {
              const isActive = activeDays[i];
              return (
                <View
                  key={`${d}-${i}`}
                  style={[
                    styles.dayBubble,
                    {
                      borderColor: isActive ? BRAND_TEAL : colors.border,
                      backgroundColor: isActive ? BRAND_TEAL : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      { color: isActive ? "#ffffff" : colors.textMuted },
                    ]}
                  >
                    {d}
                  </Text>
                  {i === todayIndex ? (
                    <View style={styles.checkMark}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.continueBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueText}>CONTINUE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  fire: {
    fontSize: 72,
    lineHeight: 88,
  },
  number: {
    position: "absolute",
    fontFamily: fonts.bold,
    fontSize: 28,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    top: 52,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  trophy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  trophyIcon: { fontSize: 18 },
  trophyText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    flexShrink: 1,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: spacing.xl,
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  checkMark: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 9,
    color: BRAND_TEAL,
    fontFamily: fonts.bold,
    lineHeight: 12,
  },
  continueBtn: {
    width: "100%",
    minHeight: 44,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: "#ffffff",
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
