import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LEARNING_MILESTONES, formatWeekOf, formatWeekStreak, toLocalDateKey, type LearningMilestone } from "@umbil/shared";

import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const getLastYearDates = () => {
  const dates: { date: Date; dateStr: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursorDate = new Date(today);

  for (let i = 0; i < 364; i++) {
    const dateStr = toLocalDateKey(cursorDate);
    dates.unshift({ date: new Date(cursorDate), dateStr });
    cursorDate.setDate(cursorDate.getDate() - 1);
  }
  return dates;
};

const MEDAL: Record<LearningMilestone, { fill: string; edge: string; ink: string }> = {
  10: { fill: "#c4844a", edge: "#8a5a2b", ink: "#3b2412" },
  25: { fill: "#cbd5e1", edge: "#64748b", ink: "#1e293b" },
  50: { fill: "#e8b923", edge: "#a16207", ink: "#422006" },
  100: { fill: "#2dd4bf", edge: "#0f766e", ink: "#042f2e" },
  200: { fill: "#38bdf8", edge: "#0369a1", ink: "#082f49" },
  500: { fill: "#a78bfa", edge: "#6d28d9", ink: "#2e1065" },
  1000: { fill: "#f59e0b", edge: "#7c3aed", ink: "#1c1917" },
};

const getShadeLevel = (count: number) => {
  if (count === 0) return 0;
  if (count >= 6) return 4;
  if (count >= 4) return 3;
  if (count >= 2) return 2;
  return 1;
};

/** Learning History heatmap — matches web `/profile` StreakCalendar. */
export const StreakHeatmap = () => {
  const { dates, currentStreak, longestStreak, totalLogs, unlockedMilestones, nextMilestone, streakFreezesAvailable, freezeOffer, useStreakFreeze, loading } = useCpdStreaks();
  const router = useRouter();
  const [spending, setSpending] = useState(false);
  const [spendError, setSpendError] = useState<string | null>(null);
  const weekScrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const calendarDates = useMemo(getLastYearDates, []);
  const todayStr = toLocalDateKey(new Date());
  const weeks = useMemo(() => buildWeeksFromDates(calendarDates), [calendarDates]);

  const handleShareStreak = async () => {
    const shareText = `🔥 ${formatWeekStreak(currentStreak)} streak! I'm using Umbil to capture clinical learning. You should check it out: https://umbil.co.uk`;
    try {
      await Share.share({
        title: "My Umbil Streak!",
        message: shareText,
      });
    } catch {
      // Share cancelled or unavailable — ignore.
    }
  };

  if (loading) {
    return (
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: fonts.regular,
          marginBottom: spacing.md,
        }}
      >
        Loading learning history...
      </Text>
    );
  }

  const levelColors = [
    "rgba(128,128,128,0.15)",
    `${colors.primary}55`,
    `${colors.primary}88`,
    `${colors.primary}bb`,
    colors.primary,
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.streakRow}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Text style={[styles.current, { color: colors.text }]}>
            Current Streak:{" "}
            <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
              {formatWeekStreak(currentStreak)} 🔥
            </Text>
          </Text>
          <Text style={[styles.longest, { color: colors.textMuted }]}>
            Longest Streak: {formatWeekStreak(longestStreak)}
          </Text>
          <Text style={[styles.streakHelp, { color: colors.textMuted }]}>
            A streak counts weeks in a row with at least one learning log. One log in a week is enough.
          </Text>
        </View>
        {currentStreak > 0 ? (
          <Pressable
            style={[styles.shareBtn, { borderColor: colors.primary }]}
            onPress={() => void handleShareStreak()}
          >
            <Text style={{ color: colors.primary, fontFamily: fonts.semiBold, fontSize: 13 }}>
              Share Streak
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.trophyRow}>
        {LEARNING_MILESTONES.map((milestone) => {
          const unlocked = unlockedMilestones.includes(milestone);
          return (
            <View
              key={milestone}
              style={[
                styles.trophySlot,
                unlocked
                  ? { borderColor: MEDAL[milestone].edge, backgroundColor: MEDAL[milestone].fill }
                  : { borderColor: colors.cardBorder, backgroundColor: "transparent" },
              ]}
            >
              {unlocked ? <View style={styles.trophyShine} /> : null}
              <View
                style={[
                  styles.trophyInner,
                  unlocked
                    ? { borderColor: "rgba(255,255,255,0.75)" }
                    : { borderColor: "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.trophyCount,
                    { color: unlocked ? MEDAL[milestone].ink : colors.textMuted, fontSize: milestone >= 1000 ? 9 : 11 },
                  ]}
                >
                  {milestone}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[styles.trophyHint, { color: colors.textMuted }]}>
        {nextMilestone
          ? `${totalLogs} learning logs. Next at ${nextMilestone}.`
          : `${totalLogs} learning logs.`}
      </Text>
      {freezeOffer ? (
        <View style={styles.freezeChoice}>
          <Text style={{ fontSize: 16, color: "#0284c7" }} accessibilityElementsHidden>
            ❄
          </Text>
          <Text style={[styles.freezeCopy, { color: colors.textMuted }]}>
            {streakFreezesAvailable === 1 ? "1 streak freeze" : `${streakFreezesAvailable} streak freezes`} · {freezeOffer.reason === "open-week" ? "this week open" : `${formatWeekOf(freezeOffer.weekKey)} missed`}
          </Text>
          <View style={styles.freezeActions}>
            <Pressable
              style={[styles.useFreeze, { backgroundColor: colors.primary }]}
              disabled={spending}
              onPress={() => {
                setSpending(true);
                setSpendError(null);
                void useStreakFreeze(freezeOffer.weekKey)
                  .catch((error: unknown) => {
                    setSpendError(error instanceof Error ? error.message : "Could not use that freeze.");
                  })
                  .finally(() => setSpending(false));
              }}
            >
              <Text style={styles.useFreezeText}>{spending ? "…" : "Use 1"}</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(app)/cpd/capture")}>
              <Text style={[styles.logLink, { color: colors.primary }]}>Log</Text>
            </Pressable>
          </View>
          {spendError ? <Text style={styles.spendError}>{spendError}</Text> : null}
        </View>
      ) : null}

      <View style={styles.gridWrap}>
        <View style={[styles.dayLabels, { marginTop: 16 }]}>
          {["M", "", "W", "", "F", "", ""].map((label, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={weekScrollRef}
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.gridScroll}
          style={styles.gridScrollView}
          onContentSizeChange={() => weekScrollRef.current?.scrollToEnd({ animated: false })}
        >
        <View>
        <View style={styles.monthRow}>
          {weeks.map((week, wi) => {
            const days = week.filter((day): day is { date: Date; dateStr: string } => day !== null);
            const firstOfMonth = days.find((day) => day.date.getDate() === 1);
            const label = firstOfMonth
              ? firstOfMonth.date.toLocaleDateString("en-GB", { month: "short" })
              : wi === 0 && days[0]
                ? days[0].date.toLocaleDateString("en-GB", { month: "short" })
                : "";
            return (
              <View key={wi} style={styles.monthCell}>
                {label ? <Text style={[styles.monthLabel, { color: colors.textMuted }]}>{label}</Text> : null}
              </View>
            );
          })}
        </View>
        <View style={styles.grid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.week}>
              {week.map((day, di) => {
                if (!day) {
                  return (
                    <View key={di} style={[styles.cell, { backgroundColor: "transparent" }]} />
                  );
                }
                const count = dates.get(day.dateStr) || 0;
                const level = getShadeLevel(count);
                const isToday = day.dateStr === todayStr;
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: levelColors[level],
                        borderWidth: isToday ? 1 : 0,
                        borderColor: colors.primary,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
        </View>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Less</Text>
        {levelColors.map((c, i) => (
          <View
            key={i}
            style={[styles.legendSwatch, { backgroundColor: c }]}
          />
        ))}
        <Text style={[styles.legendText, { color: colors.textMuted }]}>More</Text>
      </View>
    </View>
  );
};

const buildWeeksFromDates = (
  calendarDates: { date: Date; dateStr: string }[]
) => {
  const weeks: ({ date: Date; dateStr: string } | null)[][] = [];
  if (calendarDates.length === 0) return weeks;

  const first = calendarDates[0];
  const startPad = (first.date.getDay() + 6) % 7;
  let currentWeek: ({ date: Date; dateStr: string } | null)[] = [];

  for (let i = 0; i < startPad; i++) {
    currentWeek.push(null);
  }

  for (const entry of calendarDates) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(entry);
  }
  while (currentWeek.length < 7) {
    currentWeek.push(null);
  }
  weeks.push(currentWeek);
  return weeks;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.bold, fontSize: 18, marginBottom: 12 },
  streakRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  current: { fontFamily: fonts.semiBold, fontSize: 15, marginBottom: 4 },
  longest: { fontFamily: fonts.regular, fontSize: 13 },
  streakHelp: { fontFamily: fonts.regular, fontSize: 13, marginTop: 6, lineHeight: 18 },
  shareBtn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trophyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  trophySlot: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trophyShine: {
    position: "absolute",
    top: 5,
    width: 12,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  trophyInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trophyCount: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: -0.3 },
  freezeChoice: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  freezeCopy: { fontFamily: fonts.regular, fontSize: 12 },
  freezeActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  useFreeze: { borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
  useFreezeText: { color: "#fff", fontFamily: fonts.bold, fontSize: 12 },
  logLink: { fontFamily: fonts.bold, fontSize: 12 },
  spendError: { color: "#e11d48", fontFamily: fonts.regular, fontSize: 12, marginTop: 6 },
  trophyHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 8,
  },
  gridWrap: { flexDirection: "row", gap: 4 },
  dayLabels: { justifyContent: "space-between", paddingVertical: 0 },
  dayLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    height: 10,
    lineHeight: 10,
    width: 12,
  },
  gridScrollView: { flex: 1 },
  gridScroll: { paddingBottom: 4 },
  grid: { flexDirection: "row", gap: 3 },
  monthRow: { flexDirection: "row", gap: 3, height: 14, marginBottom: 2 },
  monthCell: { width: 10 },
  monthLabel: { fontFamily: fonts.semiBold, fontSize: 9, position: "absolute", width: 28 },
  week: { gap: 2 },
  cell: { width: 10, height: 10, borderRadius: 2 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 4,
  },
  legendText: { fontFamily: fonts.regular, fontSize: 11 },
  runLabel: { fontFamily: fonts.bold, fontSize: 12, marginTop: 8 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
});
