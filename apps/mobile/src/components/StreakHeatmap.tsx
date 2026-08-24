import { useMemo } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";

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
    const dateStr = cursorDate.toISOString().split("T")[0];
    dates.unshift({ date: new Date(cursorDate), dateStr });
    cursorDate.setDate(cursorDate.getDate() - 1);
  }
  return dates;
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
  const { dates, currentStreak, longestStreak, loading } = useCpdStreaks();
  const { colors } = useTheme();
  const calendarDates = useMemo(getLastYearDates, []);
  const todayStr = new Date().toISOString().split("T")[0];
  const weeks = useMemo(() => buildWeeksFromDates(calendarDates), [calendarDates]);

  const handleShareStreak = async () => {
    const shareText = `🔥 ${currentStreak}-day streak! I'm using Umbil to capture clinical learning. You should check it out: https://umbil.co.uk`;
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
              {currentStreak} {currentStreak === 1 ? "day" : "days"} 🔥
            </Text>
          </Text>
          <Text style={[styles.longest, { color: colors.textMuted }]}>
            Longest Streak: {longestStreak} days
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

      <View style={styles.gridWrap}>
        <View style={styles.dayLabels}>
          {["", "M", "", "W", "", "F", ""].map((label, i) => (
            <Text key={i} style={[styles.dayLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
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
  const startPad = first.date.getDay();
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
  week: { gap: 3 },
  cell: { width: 10, height: 10, borderRadius: 2 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 4,
  },
  legendText: { fontFamily: fonts.regular, fontSize: 11 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
});
