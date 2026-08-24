import { Ionicons } from "@expo/vector-icons";
import type { CPDEntry } from "@umbil/shared";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChromeHeader } from "@/components/ChromeHeader";
import { exportCpdLogPdf } from "@/lib/cpdPdfExport";
import { deleteCPD, getAllLogs, updateCPD } from "@/lib/store/cpd";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const PAGE_SIZE = 10;
const DEFAULT_DURATION = 10;

const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hrs" },
  { value: 120, label: "2 hrs" },
];

const durationLabel = (minutes: number) =>
  DURATION_OPTIONS.find((d) => d.value === minutes)?.label ?? `${minutes} min`;

const toCsv = (entries: CPDEntry[]) => {
  const header = "Date,Duration (min),Question,Answer,Tags,Reflection";
  const rows = entries.map((e) => {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [
      new Date(e.timestamp).toISOString(),
      String(e.duration ?? DEFAULT_DURATION),
      escape(e.question || ""),
      escape(e.answer || ""),
      escape((e.tags || []).join("; ")),
      escape(e.reflection || ""),
    ].join(",");
  });
  return [header, ...rows].join("\n");
};

const CpdScreen = () => {
  const { colors } = useTheme();
  const [allEntries, setAllEntries] = useState<CPDEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllLogs();
    if (!error) {
      setAllEntries(data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set(allEntries.flatMap((e) => e.tags || []))).sort(),
    [allEntries]
  );

  const filteredEntries = useMemo(() => {
    return allEntries.filter((e) => {
      const matchesSearch =
        !q ||
        (e.question || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.answer || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.reflection || "").toLowerCase().includes(q.toLowerCase());
      const matchesTag = !tag || (e.tags || []).includes(tag);
      return matchesSearch && matchesTag;
    });
  }, [allEntries, q, tag]);

  const totalCount = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const paginatedList = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [q, tag]);

  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const handleDelete = (id?: string) => {
    if (!id) return;
    Alert.alert("Delete this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setDeletingId(id);
            await deleteCPD(id);
            setAllEntries((prev) => prev.filter((item) => item.id !== id));
            setDeletingId(null);
          })();
        },
      },
    ]);
  };

  const handleUpdateDuration = async (id: string, minutes: number) => {
    setAllEntries((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, duration: minutes } : item
      )
    );
    await updateCPD(id, { duration: minutes });
  };

  const pickDuration = (entry: CPDEntry) => {
    if (!entry.id) return;
    Alert.alert(
      "Duration",
      undefined,
      [
        ...DURATION_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => void handleUpdateDuration(entry.id!, opt.value),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  const pickTag = () => {
    Alert.alert("Filter by tag", undefined, [
      { text: "All tags", onPress: () => setTag("") },
      ...allTags.map((t) => ({
        text: t,
        onPress: () => setTag(t),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const handleCopy = async (entry: CPDEntry) => {
    const parts = [
      entry.question,
      entry.answer,
      entry.reflection ? `Reflection: ${entry.reflection}` : "",
    ].filter(Boolean);
    await Clipboard.setStringAsync(parts.join("\n\n"));
  };

  const downloadCSV = async () => {
    if (filteredEntries.length === 0) return;
    await Share.share({
      message: toCsv(filteredEntries),
      title: "umbil-learning-log.csv",
    });
  };

  const exportPDF = async () => {
    if (filteredEntries.length === 0 || exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportCpdLogPdf(filteredEntries);
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

  const listHeader = (
    <View>
      <Text style={styles.pageTitle}>My Professional Development</Text>

      <View style={styles.tabs}>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>My CPD Log</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(app)/cpd/analytics")}
          style={styles.tab}
        >
          <Text style={styles.tabText}>Analytics</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.sectionTitle}>My Learning Log</Text>
        {totalCount > 0 ? (
          <View style={styles.exportRow}>
            <Pressable
              onPress={() => void exportPDF()}
              hitSlop={8}
              disabled={exportingPdf}
              style={styles.exportLink}
            >
              {exportingPdf ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={15} color={colors.primary} />
              )}
              <Text style={styles.csvLink}>
                {exportingPdf ? "Preparing PDF…" : "Export PDF"}
              </Text>
            </Pressable>
            <Pressable onPress={() => void downloadCSV()} hitSlop={8} style={styles.exportLink}>
              <Ionicons name="download-outline" size={15} color={colors.primary} />
              <Text style={styles.csvLink}>Download CSV</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Search..."
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        <Pressable style={styles.tagBtn} onPress={pickTag}>
          <Text style={styles.tagBtnText} numberOfLines={1}>
            {tag || "All tags"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.captureBar}
        onPress={() => router.push("/(app)/cpd/capture")}
      >
        <Text style={styles.captureText}>+ Capture learning</Text>
      </Pressable>
    </View>
  );

  const listFooter =
    !loading && totalCount > PAGE_SIZE ? (
      <View style={styles.pagination}>
        <Pressable
          style={[styles.pageBtn, currentPage === 0 && styles.pageBtnDisabled]}
          disabled={currentPage === 0}
          onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
        >
          <Text
            style={[
              styles.pageBtnText,
              currentPage === 0 && styles.pageBtnTextDisabled,
            ]}
          >
            Previous
          </Text>
        </Pressable>
        <Text style={styles.pageLabel}>
          Page {currentPage + 1} of {totalPages}
        </Text>
        <Pressable
          style={[
            styles.pageBtn,
            currentPage >= totalPages - 1 && styles.pageBtnDisabled,
          ]}
          disabled={currentPage >= totalPages - 1}
          onPress={() =>
            setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
          }
        >
          <Text
            style={[
              styles.pageBtnText,
              currentPage >= totalPages - 1 && styles.pageBtnTextDisabled,
            ]}
          >
            Next
          </Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={styles.flex}>
      <ChromeHeader />

      {loading ? (
        <View style={styles.loadingWrap}>
          {listHeader}
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading entries...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={paginatedList}
          keyExtractor={(item, idx) => item.id || `${item.timestamp}-${idx}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No CPD entries yet. Capture learning from chat or add manually.
            </Text>
          }
          renderItem={({ item }) => {
            const minutes = item.duration || DEFAULT_DURATION;
            const isDeleting = deletingId === item.id;

            return (
              <Pressable
                style={styles.card}
                onPress={() => {
                  if (!item.id) return;
                  router.push({
                    pathname: "/(app)/cpd/[id]",
                    params: { id: item.id },
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardMeta}>
                    <Text style={styles.date}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                    <Pressable
                      style={styles.timeSelector}
                      onPress={() => pickDuration(item)}
                      hitSlop={6}
                    >
                      <Text style={styles.timeSelectorText}>
                        {durationLabel(minutes)}
                      </Text>
                    </Pressable>
                  </View>

                  {item.id ? (
                    <View style={styles.cardActions}>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => void handleCopy(item)}
                        hitSlop={8}
                      >
                        <Text style={styles.copy}>Copy</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.deleteBtn,
                          isDeleting && styles.deleteBtnDisabled,
                        ]}
                        disabled={isDeleting}
                        onPress={() => handleDelete(item.id)}
                        hitSlop={8}
                      >
                        <Text style={styles.delete}>Delete</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.question} numberOfLines={4}>
                  {item.question || "Learning entry"}
                </Text>

                {item.answer ? (
                  <Text style={styles.answerPreview} numberOfLines={5}>
                    {item.answer}
                  </Text>
                ) : null}

                {item.reflection ? (
                  <View style={styles.reflectionBlock}>
                    <Text style={styles.reflectionLabel}>Reflection:</Text>
                    <Text style={styles.reflection} numberOfLines={4}>
                      {item.reflection}
                    </Text>
                  </View>
                ) : null}

                {(item.tags || []).length > 0 ? (
                  <View style={styles.tagRow}>
                    {(item.tags || []).map((t) => (
                      <View key={t} style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, paddingHorizontal: spacing.md },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 40,
    },
    loadingText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textMuted,
    },
    pageTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 22,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    tabs: {
      flexDirection: "row",
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.lg,
    },
    tab: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
      marginBottom: -1,
    },
    tabActive: { borderBottomColor: colors.primary },
    tabText: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.textMuted,
    },
    tabTextActive: {
      fontFamily: fonts.semiBold,
      color: colors.primary,
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
      gap: 10,
      flexWrap: "wrap",
    },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
    },
    exportRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    exportLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    csvLink: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.primary,
    },
    filters: {
      flexDirection: "row",
      gap: 8,
      marginBottom: spacing.md,
    },
    search: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      color: colors.text,
      fontFamily: fonts.regular,
      fontSize: 15,
      // Suppress RN Web's default black focus outline. No-op on native.
      outlineWidth: 0,
    },
    tagBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      justifyContent: "center",
      backgroundColor: colors.surface,
      maxWidth: 130,
    },
    tagBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.textMuted,
    },
    captureBar: {
      marginBottom: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: "center",
    },
    captureText: {
      color: "#fff",
      fontFamily: fonts.bold,
      fontSize: 15,
    },
    list: {
      paddingHorizontal: spacing.md,
      paddingBottom: 48,
    },
    empty: {
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 40,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 1, height: 1 },
      elevation: 2,
    },
    cardHeader: {
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
    },
    cardMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
      flex: 1,
    },
    date: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
    },
    timeSelector: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primaryMuted,
    },
    timeSelectorText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.primary,
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    actionBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    copy: {
      color: colors.primary,
      fontFamily: fonts.bold,
      fontSize: 13,
    },
    deleteBtn: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radii.sm,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.surface,
    },
    deleteBtnDisabled: { opacity: 0.5 },
    delete: {
      color: colors.danger,
      fontFamily: fonts.bold,
      fontSize: 13,
    },
    question: {
      fontFamily: fonts.semiBold,
      fontSize: 17,
      color: colors.text,
      marginBottom: 12,
      lineHeight: 24,
    },
    answerPreview: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
      marginBottom: 6,
    },
    reflectionBlock: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    reflectionLabel: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 4,
    },
    reflection: {
      fontFamily: fonts.regular,
      fontStyle: "italic",
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    tagPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.hoverBg,
    },
    tagPillText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.text,
    },
    pagination: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      gap: 8,
    },
    pageBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    pageBtnDisabled: { opacity: 0.45 },
    pageBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
    },
    pageBtnTextDisabled: { color: colors.textMuted },
    pageLabel: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textMuted,
    },
  });

export default CpdScreen;
