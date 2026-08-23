import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Svg, { G, Path } from "react-native-svg";

import {
  fetchWeeklySummary,
  type WeeklySummaryData,
  type WeeklyTopic,
} from "@/lib/weeklySummary";
import { useTheme } from "@/providers/ThemeProvider";
import type { ColorPalette } from "@/theme/colors";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

/** Soft clinical palette — matches web `WEEKLY_TOPIC_COLORS`. */
const WEEKLY_TOPIC_COLORS = [
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#64748b",
  "#ca8a04",
  "#ea580c",
  "#059669",
  "#475569",
];

const hasWeeklyActivity = (
  summary: Pick<WeeklySummaryData, "questionsAsked" | "learningLogged" | "toolsUsed">
) => summary.questionsAsked + summary.learningLogged + summary.toolsUsed > 0;

const formatWeekLabel = (weekStartDate: string, weekEndDate: string) => {
  const start = new Date(`${weekStartDate}T12:00:00`);
  const end = new Date(`${weekEndDate}T12:00:00`);
  const startLabel = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${startLabel} – ${endLabel}`;
};

type WeeklySummaryCardProps = {
  /** When true, shows Log learning / View analytics (web profile default). */
  showActions?: boolean;
  /** Compact layout for preview popup. */
  compact?: boolean;
  /** Controlled summary — if omitted, fetches on mount. */
  summary?: WeeklySummaryData | null;
  loading?: boolean;
  /** Hide the outer Weekly Summary header + Preview (parent owns them). */
  hideHeader?: boolean;
  onPreviewPress?: () => void;
};

/** Matches web Weekly Summary card wording & stats. */
export const WeeklySummaryCard = ({
  showActions = true,
  compact = false,
  summary: controlledSummary,
  loading: controlledLoading,
  hideHeader = false,
  onPreviewPress,
}: WeeklySummaryCardProps = {}) => {
  const { colors } = useTheme();
  const [fetched, setFetched] = useState<WeeklySummaryData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(controlledSummary === undefined);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isControlled = controlledSummary !== undefined;
  const summary = isControlled ? controlledSummary : fetched;
  const loading = isControlled ? !!controlledLoading : fetchLoading;
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (isControlled) return;
    let cancelled = false;
    setFetchLoading(true);
    setLastError(null);
    const timer = setTimeout(() => {
      if (!cancelled) setFetchLoading(false);
    }, 12000);

    void (async () => {
      try {
        const data = await fetchWeeklySummary();
        if (!cancelled) setFetched(data);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.warn("Weekly summary fetch failed:", message);
          setLastError(message);
          setFetched(null);
        }
      } finally {
        if (!cancelled) {
          clearTimeout(timer);
          setFetchLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isControlled, retryCount]);

  const styles = makeStyles(colors);
  const openPreview = () => {
    if (onPreviewPress) onPreviewPress();
    else setPreviewOpen(true);
  };

  if (loading) {
    return (
      <View style={styles.card}>
        {!hideHeader ? (
          <Text style={styles.title}>Weekly Summary</Text>
        ) : null}
        <Text style={styles.muted}>Loading this week's activity…</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.card}>
        {!hideHeader ? (
          <Text style={styles.title}>Weekly Summary</Text>
        ) : null}
        <Text style={styles.muted}>
          Couldn't load your weekly summary. Please try again.
        </Text>
        {lastError ? (
          <Text style={[styles.muted, { fontSize: 12, marginTop: 6, opacity: 0.7 }]}>
            {lastError}
          </Text>
        ) : null}
        {!isControlled ? (
          <Pressable
            style={[styles.previewBtn, { alignSelf: "flex-start", marginTop: 12 }]}
            onPress={() => setRetryCount((c) => c + 1)}
          >
            <Text style={styles.previewText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {!hideHeader ? (
        <View style={styles.headerRow}>
          <Text style={styles.title}>Weekly Summary</Text>
          <Pressable
            style={styles.previewBtn}
            onPress={openPreview}
            disabled={loading || !summary}
          >
            <Text style={styles.previewText}>Preview popup</Text>
          </Pressable>
        </View>
      ) : null}

      <SummaryBody
        summary={summary}
        compact={compact}
        showActions={showActions}
        colors={colors}
        styles={styles}
      />

      {!onPreviewPress ? (
        <PreviewModal
          visible={previewOpen}
          onClose={() => setPreviewOpen(false)}
          summary={summary}
          colors={colors}
          styles={styles}
        />
      ) : null}
    </View>
  );
};

const SummaryBody = ({
  summary,
  compact,
  showActions,
  colors,
  styles,
}: {
  summary: WeeklySummaryData;
  compact: boolean;
  showActions: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) => {
  const active = hasWeeklyActivity(summary);
  const rangeLabel = formatWeekLabel(summary.weekStart, summary.weekEnd);
  const pieData = summary.questionTopics.filter((t) => t.count > 0);

  return (
    <View>
      <Text style={styles.week}>This week · {rangeLabel}</Text>

      {!active ? (
        <Text style={styles.emptyActivity}>
          No activity yet this week — ask a question or log a reflection to get
          started.
        </Text>
      ) : (
        <>
          <View style={styles.statsBar}>
            <Stat value={summary.questionsAsked} label="Questions" colors={colors} compact={compact} />
            <Stat value={summary.learningLogged} label="Learning logs" colors={colors} compact={compact} />
            <Stat value={summary.toolsUsed} label="Tools used" colors={colors} compact={compact} />
            <Stat
              value={`${summary.activeDays}/7`}
              label="Active days"
              colors={colors}
              compact={compact}
            />
          </View>

          {summary.topQuestionTopic && summary.questionsAsked > 0 ? (
            <Text style={styles.topicLine}>
              Most asked topic:{" "}
              <Text style={styles.topicStrong}>{summary.topQuestionTopic}</Text>
            </Text>
          ) : null}

          {pieData.length > 0 ? (
            <View style={styles.topicsBlock}>
              <Text style={styles.subTitle}>Questions by specialty</Text>
              <View style={styles.pieRow}>
                <SpecialtyDonut data={pieData} size={compact ? 120 : 150} />
                <View style={styles.legendCol}>
                  {pieData.slice(0, 6).map((t, i) => {
                    const pct = Math.round(
                      (t.count / Math.max(1, summary.questionsAsked)) * 100
                    );
                    return (
                      <View key={t.name} style={styles.topicRow}>
                        <View
                          style={[
                            styles.swatch,
                            {
                              backgroundColor:
                                WEEKLY_TOPIC_COLORS[i % WEEKLY_TOPIC_COLORS.length],
                            },
                          ]}
                        />
                        <Text style={styles.topicName} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <Text style={styles.topicMeta}>
                          {t.count} · {pct}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {summary.loggedTopics?.length ? (
            <View style={styles.topicsBlock}>
              <Text style={styles.subTitle}>Topics you logged</Text>
              <View style={styles.chipWrap}>
                {summary.loggedTopics.map((topic) => (
                  <View key={topic.name} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {topic.name}
                      {topic.count > 1 ? ` · ${topic.count}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {summary.toolsByType?.length ? (
            <View style={styles.topicsBlock}>
              <Text style={styles.subTitle}>Tools</Text>
              {summary.toolsByType.slice(0, 4).map((t) => (
                <Text key={t.name} style={styles.toolLine}>
                  {t.name}
                  {t.count > 1 ? ` × ${t.count}` : ""}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}

      {summary.encouragement ? (
        <Text style={styles.encouragement}>{summary.encouragement}</Text>
      ) : null}

      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push("/(app)/cpd/capture")}
          >
            <Text style={styles.primaryBtnText}>Log learning</Text>
          </Pressable>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => router.push("/(app)/cpd/analytics")}
          >
            <Text style={styles.outlineBtnText}>View analytics</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const PreviewModal = ({
  visible,
  onClose,
  summary,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  summary: WeeklySummaryData;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Your week on Umbil
          </Text>
          <Text style={[styles.previewNote, { color: colors.textMuted }]}>
            Preview — closing won't mark this week as seen
          </Text>
          <SummaryBody
            summary={summary}
            compact
            showActions
            colors={colors}
            styles={styles}
          />
          <Pressable style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Close preview</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const Stat = ({
  value,
  label,
  colors,
  compact,
}: {
  value: string | number;
  label: string;
  colors: ColorPalette;
  compact?: boolean;
}) => (
  <View style={{ flex: 1, alignItems: "center", minWidth: compact ? 64 : 72, paddingVertical: compact ? 8 : 12 }}>
    <Text
      style={{
        fontFamily: fonts.bold,
        fontSize: compact ? 20 : 24,
        color: colors.primary,
        lineHeight: compact ? 22 : 26,
      }}
    >
      {value}
    </Text>
    <Text
      style={{
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
        textAlign: "center",
        lineHeight: 14,
      }}
    >
      {label}
    </Text>
  </View>
);

const SpecialtyDonut = ({
  data,
  size,
}: {
  data: WeeklyTopic[];
  size: number;
}) => {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.26;
  let angle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const sweep = Math.min((d.count / total) * Math.PI * 2, Math.PI * 2 - 0.001);
    const start = angle;
    const end = angle + Math.max(sweep, 0.001);
    angle = end;
    return {
      path: donutSlice(cx, cy, innerR, outerR, start, end),
      color: WEEKLY_TOPIC_COLORS[i % WEEKLY_TOPIC_COLORS.length],
      key: d.name,
    };
  });

  return (
    <Svg width={size} height={size}>
      <G>
        {slices.map((s) => (
          <Path key={s.key} d={s.path} fill={s.color} />
        ))}
      </G>
    </Svg>
  );
};

const polar = (cx: number, cy: number, r: number, a: number) => ({
  x: cx + r * Math.cos(a),
  y: cy + r * Math.sin(a),
});

const donutSlice = (
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  start: number,
  end: number
) => {
  const large = end - start > Math.PI ? 1 : 0;
  const o1 = polar(cx, cy, outerR, start);
  const o2 = polar(cx, cy, outerR, end);
  const i1 = polar(cx, cy, innerR, end);
  const i2 = polar(cx, cy, innerR, start);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
      margin: 0,
    },
    previewBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    previewText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
    },
    week: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    emptyActivity: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
      lineHeight: 21,
      marginBottom: 12,
    },
    statsBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      backgroundColor: colors.hoverBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    topicLine: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
      marginBottom: 14,
      lineHeight: 20,
    },
    topicStrong: { fontFamily: fonts.bold, color: colors.primary },
    topicsBlock: { marginBottom: 14 },
    subTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 8,
    },
    pieRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
    },
    legendCol: { flex: 1, minWidth: 120 },
    topicRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      gap: 8,
    },
    swatch: { width: 8, height: 8, borderRadius: 2 },
    topicName: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
    },
    topicMeta: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
    },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(51, 225, 255, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(51, 225, 255, 0.25)",
    },
    chipText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
    },
    toolLine: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
      lineHeight: 20,
      paddingLeft: 4,
    },
    encouragement: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
      marginBottom: 4,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16,
    },
    primaryBtn: {
      flexGrow: 1,
      flexBasis: 120,
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontFamily: fonts.bold, fontSize: 14 },
    outlineBtn: {
      flexGrow: 1,
      flexBasis: 120,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: "center",
    },
    outlineBtnText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 14 },
    muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: {
      borderRadius: 24,
      borderWidth: 1,
      padding: spacing.lg,
      maxHeight: "90%",
    },
    modalTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      textAlign: "center",
      marginBottom: 8,
    },
    previewNote: {
      fontFamily: fonts.regular,
      fontSize: 13,
      textAlign: "center",
      marginBottom: 16,
    },
  });
