import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LEARNING_MILESTONES, formatWeekOf, formatWeekStreak, mondayOfLocal, toLocalDateKey, toWeekKey, countedRunLength, streakRunLabel } from "@umbil/shared";

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

const TROPHY_MARK: Record<number, string> = {
  10: "🥉",
  25: "🥈",
  50: "🥇",
  100: "💎",
  200: "♦️",
  500: "🦅",
  1000: "💫",
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
  const { dates, loggedWeekKeys, freezeWeekKeys, currentStreak, longestStreak, totalLogs, unlockedMilestones, nextMilestone, streakFreezesAvailable, freezeOffer, useStreakFreeze, loading } = useCpdStreaks();
  const router = useRouter();
  const [spending, setSpending] = useState(false);
  const [spendError, setSpendError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<{ weekKey: string; label: string } | null>(null);
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
      <Text style={[styles.title, { color: colors.text }]}>Learning History</Text>

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
                {
                  borderColor: colors.cardBorder,
                  backgroundColor: unlocked ? colors.primaryMuted : "transparent",
                  opacity: unlocked ? 1 : 0.45,
                },
              ]}
            >
              <Text style={styles.trophyIcon}>{unlocked ? TROPHY_MARK[milestone] : "🔒"}</Text>
              <Text style={[styles.trophyCount, { color: colors.text }]}>{milestone}</Text>
              <Text style={[styles.trophyUnit, { color: colors.textMuted }]}>logs</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.trophyHint, { color: colors.textMuted }]}>
        {nextMilestone
          ? `${totalLogs} learning logs. Next trophy at ${nextMilestone}.`
          : `${totalLogs} learning logs.`}
      </Text>
      {freezeOffer ? (
        <View style={styles.freezeChoice}>
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
        <View style={styles.dayLabels}>
          {["M", "", "W", "", "F", "", ""].map((label, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {weeks.map((week, wi) => {
            const sample = week.find((day) => day !== null);
            const weekKey = sample ? toWeekKey(mondayOfLocal(sample.date)) : "";
            const counted = loggedWeekKeys.includes(weekKey);
            const frozen = freezeWeekKeys.includes(weekKey) && !counted;
            const neighborCounted = (index: number) => {
              const neighbor = weeks[index];
              if (!neighbor) return false;
              const neighborSample = neighbor.find((day) => day !== null);
              const neighborKey = neighborSample ? toWeekKey(mondayOfLocal(neighborSample.date)) : "";
              return neighborKey ? loggedWeekKeys.includes(neighborKey) : false;
            };
            const joinPrev = counted && neighborCounted(wi - 1);
            const joinNext = counted && neighborCounted(wi + 1);
            const runLabel = counted ? streakRunLabel(countedRunLength(wi, neighborCounted)) : "";
            return (
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
              <Pressable
                disabled={!counted}
                hitSlop={{ top: 10, bottom: 8, left: 1, right: 1 }}
                accessibilityRole={counted ? "button" : undefined}
                accessibilityLabel={counted ? runLabel : undefined}
                onPress={() => {
                  if (!counted) return;
                  setSelectedRun((current) => current?.weekKey === weekKey ? null : { weekKey, label: runLabel });
                }}
              >
                <View
                  style={[
                    styles.weekBar,
                    counted ? styles.weekBarCounted : frozen ? styles.weekBarFrozen : null,
                    counted && {
                      width: 10 + (joinPrev ? 3 : 0) + (joinNext ? 3 : 0),
                      marginLeft: joinPrev ? -3 : 0,
                      marginRight: joinNext ? -3 : 0,
                      borderTopLeftRadius: joinPrev ? 0 : 2,
                      borderBottomLeftRadius: joinPrev ? 0 : 2,
                      borderTopRightRadius: joinNext ? 0 : 2,
                      borderBottomRightRadius: joinNext ? 0 : 2,
                    },
                  ]}
                />
              </Pressable>
            </View>
            );
          })}
        </View>
      </View>

      {selectedRun ? (
        <Text style={[styles.runLabel, { color: colors.text }]}>{selectedRun.label}</Text>
      ) : null}
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
    minWidth: 52,
    borderWidth: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  trophyIcon: { fontSize: 16, lineHeight: 20 },
  trophyCount: { fontFamily: fonts.bold, fontSize: 12 },
  trophyUnit: { fontFamily: fonts.bold, fontSize: 9, textTransform: "uppercase" },
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
  grid: { flexDirection: "row", gap: 3, flex: 1, overflow: "hidden" },
  week: { gap: 2 },
  weekBar: { height: 3, width: 8, borderRadius: 2, marginTop: 1, alignSelf: "center", backgroundColor: "transparent" },
  weekBarCounted: { backgroundColor: "#f97316", width: 10, marginLeft: 0, marginRight: 0 },
  weekBarFrozen: { backgroundColor: "#38bdf8" },
  cell: { width: 10, height: 10, borderRadius: 2 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 4,
  },
  legendText: { fontFamily: fonts.regular, fontSize: 11 },
  runLabel: { fontFamily: fonts.bold, fontSize: 12, marginTop: 8 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
});
