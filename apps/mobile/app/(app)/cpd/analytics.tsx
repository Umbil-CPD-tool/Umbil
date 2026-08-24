import { Ionicons } from "@expo/vector-icons";
import type { CPDEntry } from "@umbil/shared";
import { Stack, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  FrequencyLine,
  GmcRadar,
  ProgressRing,
} from "@/components/cpd/AnalyticsCharts";
import {
  ANNUAL_TARGET,
  DEFAULT_CREDITS,
  filterDataByTime,
  getAdvisorMessage,
  processGmcData,
  processTagData,
  processTimelineData,
  shortGmcLabel,
  type TimeFilter,
} from "@/lib/cpdAnalytics";
import { exportCpdLogPdf } from "@/lib/cpdPdfExport";
import { getCPD } from "@/lib/store/cpd";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

/**
 * §1 CPD Analytics — port of `src/app/cpd/analytics/page.tsx`
 * + layout chrome from `CpdLayoutClient` (title + tabs).
 */
export default function CpdAnalyticsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [entries, setEntries] = useState<CPDEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    void getCPD().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const currentYear = new Date().getFullYear();
  const thisYearEntries = useMemo(
    () =>
      entries.filter((e) => new Date(e.timestamp).getFullYear() === currentYear),
    [entries, currentYear]
  );
  const totalCredits = thisYearEntries.length * DEFAULT_CREDITS;
  const progressPercent = Math.min(100, (totalCredits / ANNUAL_TARGET) * 100);
  const currentMonth = new Date().getMonth();
  const thisMonthEntries = thisYearEntries.filter(
    (e) => new Date(e.timestamp).getMonth() === currentMonth
  );

  const yearGmc = useMemo(
    () => processGmcData(thisYearEntries),
    [thisYearEntries]
  );
  const topDomain = [...yearGmc].sort((a, b) => b.count - a.count)[0];

  const filteredData = useMemo(
    () => filterDataByTime(entries, timeFilter),
    [entries, timeFilter]
  );
  const tagData = useMemo(() => processTagData(filteredData), [filteredData]);
  const gmcDomainData = useMemo(
    () => processGmcData(filteredData),
    [filteredData]
  );
  const timelineData = useMemo(
    () => processTimelineData(filteredData),
    [filteredData]
  );

  const styles = makeStyles(colors);
  const chartWidth = Math.min(width - spacing.lg * 2 - 40, 360);

  const exportPDF = async () => {
    if (entries.length === 0 || exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportCpdLogPdf(entries);
    } catch (err) {
      Alert.alert(
        "Export failed",
        err instanceof Error ? err.message : "Could not generate PDF"
      );
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "My Professional Development",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
        }}
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>My Professional Development</Text>
            {entries.length > 0 ? (
              <Pressable
                onPress={() => void exportPDF()}
                disabled={exportingPdf}
                style={styles.exportLink}
                hitSlop={8}
              >
                {exportingPdf ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                )}
                <Text style={styles.exportLinkText}>
                  {exportingPdf ? "Preparing…" : "Export PDF"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={styles.tab}
              onPress={() => router.replace("/(app)/(drawer)/cpd")}
            >
              <Text style={styles.tabText}>My CPD Log</Text>
            </Pressable>
            <Pressable style={[styles.tab, styles.tabActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>
                Analytics
              </Text>
            </Pressable>
          </View>

          <View style={styles.advisor}>
            <View style={styles.advisorHead}>
              <Text style={styles.advisorEmoji}>💡</Text>
              <Text style={styles.advisorTitle}>Continuous Learning Advisor</Text>
            </View>
            <Text style={styles.advisorBody}>
              {getAdvisorMessage(totalCredits, thisMonthEntries.length)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.ringWrap}>
              <ProgressRing progress={progressPercent} />
              <Text style={styles.ringPct}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bigMetric}>{totalCredits.toFixed(2)}</Text>
              <Text style={styles.metricLabel}>
                Hours Logged{"\n"}(Target: {ANNUAL_TARGET})
              </Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View>
              <Text style={styles.metricLabel}>Entries This Month</Text>
              <View style={styles.inlineMetric}>
                <Text style={styles.tealMetric}>{thisMonthEntries.length}</Text>
                <Text style={styles.metricHint}>entries</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Strongest Area</Text>
            <Text style={styles.strongArea}>
              {topDomain && topDomain.count > 0
                ? topDomain.domain
                : "No data yet"}
            </Text>
            {topDomain && topDomain.count > 0 ? (
              <Text style={styles.tealHint}>
                {topDomain.count} entries logged
              </Text>
            ) : null}
          </View>

          <View style={styles.detailHead}>
            <Text style={styles.detailTitle}>Detailed Analysis</Text>
            <View style={styles.filterRow}>
              {(
                [
                  ["all", "All Time"],
                  ["year", "Last Year"],
                  ["month", "Last Month"],
                  ["week", "Last Week"],
                ] as const
              ).map(([id, label]) => (
                <Pressable
                  key={id}
                  onPress={() => setTimeFilter(id)}
                  style={[
                    styles.filterChip,
                    timeFilter === id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      timeFilter === id && styles.filterTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.chartTitle}>Top Clinical Topics</Text>
            {tagData.length === 0 ? (
              <Text style={styles.empty}>No clinical tags found.</Text>
            ) : (
              tagData.map((d, index) => {
                const max = tagData[0]?.count || 1;
                return (
                  <View key={d.name} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={2}>
                      {d.name}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.round((d.count / max) * 100)}%`,
                            opacity: index < 3 ? 1 : 0.4,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barCount}>{d.count}</Text>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.chartTitle}>GMC Domain Balance</Text>
            <View style={{ alignItems: "center" }}>
              <GmcRadar values={gmcDomainData.map((d) => d.count)} />
              <View style={styles.radarLegend}>
                {gmcDomainData.map((d) => (
                  <Text key={d.domain} style={styles.radarLegendItem}>
                    {shortGmcLabel(d.domain).join(" ")}: {d.count}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.chartTitle}>Learning Frequency</Text>
            {timelineData.length === 0 ? (
              <Text style={styles.empty}>No activity data yet.</Text>
            ) : (
              <FrequencyLine
                data={timelineData}
                width={chartWidth}
                formatX={(dateStr) => {
                  const date = new Date(dateStr);
                  return timeFilter === "week"
                    ? date.toLocaleDateString("en-GB", { weekday: "short" })
                    : date.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      });
                }}
              />
            )}
          </View>
        </ScrollView>
      )}
    </>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    pageTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 22,
      color: colors.text,
      flexShrink: 1,
    },
    exportLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    exportLinkText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.primary,
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 4,
    },
    tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 4 },
    tabActive: {
      borderBottomWidth: 3,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.textMuted,
    },
    tabTextActive: { fontFamily: fonts.semiBold, color: colors.primary },
    advisor: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      padding: spacing.lg,
    },
    advisorHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    advisorEmoji: { fontSize: 18 },
    advisorTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.text,
    },
    advisorBody: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textMuted,
    },
    metricCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    ringWrap: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
    ringPct: {
      position: "absolute",
      fontFamily: fonts.bold,
      fontSize: 13,
      color: colors.primary,
    },
    bigMetric: {
      fontFamily: fonts.bold,
      fontSize: 32,
      color: colors.text,
      lineHeight: 36,
    },
    metricLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: "uppercase",
      marginTop: 4,
    },
    inlineMetric: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    tealMetric: {
      fontFamily: fonts.bold,
      fontSize: 32,
      color: colors.primary,
    },
    metricHint: { fontFamily: fonts.regular, color: colors.textMuted },
    strongArea: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    tealHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.primary,
      marginTop: 4,
    },
    detailHead: { marginTop: spacing.sm, gap: 10 },
    detailTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
    },
    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    filterText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.textMuted,
    },
    filterTextActive: { color: colors.primary },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
    },
    chartTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: colors.text,
      marginBottom: 14,
    },
    empty: {
      fontFamily: fonts.regular,
      fontStyle: "italic",
      color: colors.textMuted,
    },
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    barLabel: {
      width: 100,
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.text,
    },
    barTrack: {
      flex: 1,
      height: 18,
      borderRadius: 4,
      backgroundColor: colors.hoverBg,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    barCount: {
      width: 24,
      textAlign: "right",
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.text,
    },
    radarLegend: { marginTop: 8, gap: 4, alignSelf: "stretch" },
    radarLegendItem: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
