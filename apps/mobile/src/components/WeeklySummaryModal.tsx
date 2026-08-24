import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  dismissWeeklySummary,
  fetchWeeklySummary,
  type WeeklySummaryData,
} from "@/lib/weeklySummary";
import { colors, radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

/** Weekend auto-popup — mirrors web dashboard behaviour. */
export const WeeklySummaryModal = () => {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    if (!isWeekend) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const data = await fetchWeeklySummary();
        setSummary(data);
        setLoading(false);
        if (data && !data.alreadySeen && data.questionsAsked + data.learningLogged > 0) {
          setOpen(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("WeeklySummaryModal: fetchWeeklySummary failed:", message);
        setLoading(false);
        setOpen(false);
      }
    })();
  }, []);

  if (loading || !summary) return null;

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Your week on Umbil</Text>
          <Text style={styles.encouragement}>{summary.encouragement}</Text>
          <View style={styles.stats}>
            <Stat value={summary.questionsAsked} label="Questions" />
            <Stat value={summary.learningLogged} label="CPD logged" />
            <Stat value={summary.activeDays} label="Active days" />
            <Stat value={summary.toolsUsed} label="Tools used" />
          </View>
          {summary.topQuestionTopic ? (
            <Text style={styles.topic}>Top focus: {summary.topQuestionTopic}</Text>
          ) : null}
          <Pressable
            style={styles.btn}
            onPress={() => {
              void dismissWeeklySummary().then(() => setOpen(false));
            }}
          >
            <Text style={styles.btnText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const Stat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
  },
  encouragement: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  stats: { flexDirection: "row", flexWrap: "wrap" },
  stat: { width: "50%", alignItems: "center", marginBottom: 12 },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  topic: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  btn: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  btnText: { color: "#fff", fontFamily: fonts.bold },
});
