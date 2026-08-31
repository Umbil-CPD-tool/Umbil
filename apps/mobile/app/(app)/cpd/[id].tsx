import { Ionicons } from "@expo/vector-icons";
import type { CPDEntry } from "@umbil/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MarkdownBody } from "@/components/MarkdownBody";
import { useCenteredContentStyle } from "@/components/ScreenSafe";
import { exportCpdEntryPdf } from "@/lib/cpdPdfExport";
import { getAllLogs } from "@/lib/store/cpd";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const CpdDetailScreen = () => {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contentStyle = useCenteredContentStyle();
  const [entry, setEntry] = useState<CPDEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await getAllLogs();
      setEntry(data.find((e) => e.id === id) || null);
      setLoading(false);
    })();
  }, [id]);

  const handleExport = async () => {
    if (!entry || exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportCpdEntryPdf(entry);
    } catch (err) {
      Alert.alert(
        "Export failed",
        err instanceof Error ? err.message : "Could not generate PDF"
      );
    } finally {
      setExportingPdf(false);
    }
  };

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
        <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
          <Text style={styles.meta}>
            {new Date(entry.timestamp).toLocaleString()}
            {entry.duration ? ` · ${entry.duration} min` : ""}
          </Text>
          <Text style={styles.title}>{entry.question}</Text>
          {entry.tags?.length ? (
            <Text style={styles.tags}>{entry.tags.join(" · ")}</Text>
          ) : null}
          <Pressable
            onPress={() => void handleExport()}
            disabled={exportingPdf}
            style={styles.exportBtn}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="document-text-outline"
                size={16}
                color={colors.primary}
              />
            )}
            <Text style={styles.exportBtnText}>
              {exportingPdf ? "Preparing PDF…" : "Export PDF"}
            </Text>
          </Pressable>
          <View style={styles.card}>
            <Text style={styles.label}>Answer / notes</Text>
            {entry.answer ? (
              <MarkdownBody>{entry.answer}</MarkdownBody>
            ) : (
              <Text style={styles.body} selectable>
                —
              </Text>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Reflection</Text>
            {entry.reflection ? (
              <MarkdownBody>{entry.reflection}</MarkdownBody>
            ) : (
              <Text style={styles.body} selectable>
                —
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </>
  );
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.lg },
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
    exportBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginBottom: spacing.md,
      paddingVertical: 6,
    },
    exportBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.primary,
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

export default CpdDetailScreen;
