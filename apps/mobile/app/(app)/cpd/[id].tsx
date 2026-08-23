import type { CPDEntry } from "@umbil/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { getAllLogs } from "@/lib/store/cpd";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

export default function CpdDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<CPDEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await getAllLogs();
      setEntry(data.find((e) => e.id === id) || null);
      setLoading(false);
    })();
  }, [id]);

  const styles = makeStyles(colors);

  return (
    <>
      <Stack.Screen
        options={{
          title: "CPD entry",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
        }}
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : !entry ? (
        <Text style={styles.empty}>Entry not found.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.meta}>
            {new Date(entry.timestamp).toLocaleString()}
            {entry.duration ? ` · ${entry.duration} min` : ""}
          </Text>
          <Text style={styles.title}>{entry.question}</Text>
          {entry.tags?.length ? (
            <Text style={styles.tags}>{entry.tags.join(" · ")}</Text>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.label}>Answer / notes</Text>
            <Text style={styles.body} selectable>
              {entry.answer || "—"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Reflection</Text>
            <Text style={styles.body} selectable>
              {entry.reflection || "—"}
            </Text>
          </View>
        </ScrollView>
      )}
    </>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.lg, paddingBottom: 48 },
    empty: {
      padding: spacing.lg,
      color: colors.textMuted,
      fontFamily: fonts.regular,
    },
    meta: {
      color: colors.textMuted,
      marginBottom: 8,
      fontFamily: fonts.regular,
      fontSize: 13,
    },
    title: {
      fontSize: 22,
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: 8,
    },
    tags: {
      color: colors.primary,
      marginBottom: 16,
      fontFamily: fonts.semiBold,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    label: {
      fontSize: 12,
      fontFamily: fonts.bold,
      color: colors.textMuted,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      fontFamily: fonts.regular,
    },
  });
