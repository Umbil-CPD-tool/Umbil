import { WORKFLOW_TOOLS, type WorkflowToolId } from "@umbil/shared";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Clipboard from "expo-clipboard";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { streamTool } from "@/lib/api";
import { analyzeTriageInput, type TriageAnalysis } from "@/lib/digitalTriage";
import { getMyProfile } from "@/lib/profile";
import { printHandout } from "@/lib/printHandout";
import { clearDraft, getDraft, saveDraft } from "@/lib/store/drafts";
import { getSupabase } from "@/lib/supabase";
import { getToolHistory, type ToolHistoryRow } from "@/lib/store/tools";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";
import { useCenteredContentStyle } from "@/components/ScreenSafe";

type ReferralMode = "quick" | "detailed";

const isWorkflowToolId = (value: string | undefined): value is WorkflowToolId =>
  WORKFLOW_TOOLS.some((t) => t.id === value);

const parseToolParam = (
  value: string | string[] | undefined
): WorkflowToolId | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  return isWorkflowToolId(raw) ? raw : null;
};

const stripMarkdown = (md: string) => {
  if (!md) return "";
  return md
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+(.*)/gm, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
};

export default function ToolsScreen() {
  const { colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const contentStyle = useCenteredContentStyle();
  const { tool: toolParam } = useLocalSearchParams<{ tool?: string }>();
  const initialTool = parseToolParam(toolParam) ?? "referral";
  const [toolId, setToolId] = useState<WorkflowToolId>(initialTool);
  const [input, setInput] = useState("");
  const skipDraftSaveRef = useRef(true);
  const skipDraftLoadRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolIdRef = useRef(toolId);
  toolIdRef.current = toolId;
  const [output, setOutput] = useState("");
  const [translatedOutput, setTranslatedOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHint, setCopiedHint] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [signerName, setSignerName] = useState<string | null>(null);
  const [signerRole, setSignerRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<ToolHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [referralMode, setReferralMode] = useState<ReferralMode>("detailed");
  const [recentLanguages, setRecentLanguages] = useState<string[]>([]);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [triageMeta, setTriageMeta] = useState<TriageAnalysis | null>(null);

  const active = WORKFLOW_TOOLS.find((t) => t.id === toolId)!;
  const styles = makeStyles(colors);

  const refreshHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      setHistory(await getToolHistory(5));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const profile = await getMyProfile();
      setSignerName(profile?.full_name ?? null);
      setSignerRole(profile?.grade ?? null);

      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await getSupabase()
        .from("profiles")
        .select("recent_languages")
        .eq("id", user.id)
        .single();

      if (data?.recent_languages && Array.isArray(data.recent_languages)) {
        setRecentLanguages(data.recent_languages as string[]);
      }
    })();
  }, []);

  const resetToolUi = () => {
    setOutput("");
    setTranslatedOutput("");
    setError(null);
    setEditing(false);
    setShowHistory(false);
    setReferralMode("detailed");
    setTriageMeta(null);
  };

  useEffect(() => {
    const parsed = parseToolParam(toolParam);
    if (parsed && parsed !== toolIdRef.current) {
      setToolId(parsed);
      setInput("");
      resetToolUi();
    }
  }, [toolParam]);

  useEffect(() => {
    if (skipDraftLoadRef.current) {
      skipDraftLoadRef.current = false;
      skipDraftSaveRef.current = false;
      return;
    }

    skipDraftSaveRef.current = true;
    setInput("");
    let cancelled = false;

    void (async () => {
      try {
        const savedDraft = await getDraft(toolId);
        if (cancelled) return;
        if (savedDraft) setInput(savedDraft);
      } catch (err) {
        console.error("Failed to load draft", err);
      } finally {
        if (!cancelled) skipDraftSaveRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toolId]);

  useEffect(() => {
    if (skipDraftSaveRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDraft(toolId, input);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [input, toolId]);

  const selectTool = (id: WorkflowToolId) => {
    if (id === toolId) return;
    setToolId(id);
    setInput("");
    resetToolUi();
  };

  const onInputChange = (text: string) => {
    skipDraftSaveRef.current = false;
    setInput(text);
  };

  const toggleHistory = () => {
    if (!showHistory) {
      void refreshHistory();
    }
    setShowHistory((v) => !v);
  };

  const generate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setOutput("");
    setTranslatedOutput("");
    setEditing(false);
    setShowHistory(false);
    setTriageMeta(
      toolId === "digital_triage" ? analyzeTriageInput(input) : null
    );

    try {
      const final = await streamTool({
        toolType: toolId,
        input: input.trim(),
        signerName,
        signerRole,
        referralMode: toolId === "referral" ? referralMode : "detailed",
        onChunk: setOutput,
      });

      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (user) {
        await getSupabase().from("tool_history").insert({
          user_id: user.id,
          tool_id: toolId,
          tool_name: active.label,
          input: input.trim(),
          output: final,
        });
        void refreshHistory();
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      skipDraftSaveRef.current = true;
      await clearDraft(toolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool failed";
      if (
        message === "LIMIT_REACHED" ||
        message.includes("LIMIT_REACHED")
      ) {
        setError(
          "Monthly free tool limit reached. Upgrade to Pro for unlimited tools."
        );
      } else {
        setError(message);
        setOutput("Error generating content. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const persistRecentLanguage = (lang: string) => {
    const next = Array.from(new Set([lang, ...recentLanguages])).slice(0, 5);
    setRecentLanguages(next);
    if (!userId) return;
    void getSupabase()
      .from("profiles")
      .update({ recent_languages: next })
      .eq("id", userId)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error("Failed to save language preference:", updateError);
        }
      });
  };

  const translate = async (langToUse: string) => {
    const lang = langToUse.trim();
    if (!output.trim() || !lang || translating) return;

    setShowTranslateModal(false);
    setTranslating(true);
    setTranslatedOutput("");
    persistRecentLanguage(lang);

    try {
      await streamTool({
        toolType: "translate_handout",
        input: output,
        targetLanguage: lang,
        onChunk: setTranslatedOutput,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not translate";
      if (
        message === "LIMIT_REACHED" ||
        message.includes("LIMIT_REACHED")
      ) {
        setError(
          "Monthly free tool limit reached. Upgrade to Pro for unlimited tools."
        );
      } else {
        Alert.alert("Translate failed", message);
        setTranslatedOutput("Error translating content. Please try again.");
      }
    } finally {
      setTranslating(false);
    }
  };

  const restore = (row: ToolHistoryRow) => {
    const matched = WORKFLOW_TOOLS.find((t) => t.id === row.tool_id);
    if (matched && matched.id !== toolId) {
      skipDraftLoadRef.current = true;
      setToolId(matched.id);
    }
    setInput(row.input);
    setOutput(row.output);
    setTranslatedOutput("");
    setEditing(false);
    setError(null);
    setShowHistory(false);
    setTriageMeta(
      row.tool_id === "digital_triage" ? analyzeTriageInput(row.input) : null
    );
  };

  const handleCopy = async () => {
    let textToCopy = translatedOutput
      ? `--- ENGLISH ---\n\n${output}\n\n--- TRANSLATION ---\n\n${translatedOutput}`
      : output;
    textToCopy = stripMarkdown(textToCopy);
    await Clipboard.setStringAsync(textToCopy);
    setCopiedHint(true);
    setTimeout(() => setCopiedHint(false), 1600);
  };

  const openTranslate = () => {
    setTargetLanguage(recentLanguages[0] ?? "");
    setShowTranslateModal(true);
  };

  const handlePrint = async () => {
    if (!output.trim() || printing) return;
    setPrinting(true);
    try {
      await printHandout({
        title: active.label,
        output,
        translatedOutput: translatedOutput || undefined,
      });
    } catch (err) {
      Alert.alert(
        "Print failed",
        err instanceof Error ? err.message : "Could not open the print dialog"
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Workflow tools",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
          headerRight: () => (
            <Pressable onPress={toggleHistory} hitSlop={8}>
              <Text
                style={[
                  styles.headerAction,
                  showHistory && { color: colors.primary },
                ]}
              >
                Recent
              </Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {showHistory ? (
            <View>
              <Text style={styles.sectionLabel}>Recent Generations</Text>
              {loadingHistory ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={{ marginTop: spacing.md }}
                />
              ) : history.length === 0 ? (
                <Text style={styles.emptyHint}>No recent history found.</Text>
              ) : (
                <View style={styles.historyList}>
                  {history.map((row) => (
                    <Pressable
                      key={row.id}
                      style={styles.historyCard}
                      onPress={() => restore(row)}
                    >
                      <View style={styles.historyCardHeader}>
                        <Text style={styles.historyName}>{row.tool_name}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.historyPreview} numberOfLines={1}>
                        {row.output.slice(0, 60)}
                        {row.output.length > 60 ? "…" : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.toolRow}>
                  {WORKFLOW_TOOLS.map((tool) => (
                    <Pressable
                      key={tool.id}
                      onPress={() => selectTool(tool.id)}
                      style={[
                        styles.chip,
                        toolId === tool.id && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          toolId === tool.id && styles.chipTextActive,
                        ]}
                      >
                        {tool.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.desc}>{active.description}</Text>

              <View style={styles.inputHeader}>
                <View style={styles.inputHeaderLeft}>
                  <Text style={styles.sectionLabel}>Clinical Notes</Text>
                  {toolId === "referral" ? (
                    <View style={styles.modeToggle}>
                      {(["quick", "detailed"] as const).map((mode) => (
                        <Pressable
                          key={mode}
                          onPress={() => setReferralMode(mode)}
                          style={[
                            styles.modeBtn,
                            referralMode === mode && styles.modeBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.modeBtnText,
                              referralMode === mode && styles.modeBtnTextActive,
                            ]}
                          >
                            {mode === "quick" ? "Quick" : "Detailed"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                {input ? (
                  <Pressable onPress={() => onInputChange("")} hitSlop={8}>
                    <Text style={styles.clearLink}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              <TextInput
                style={styles.input}
                multiline
                value={input}
                onChangeText={onInputChange}
                placeholder={active.placeholder}
                placeholderTextColor={colors.textMuted}
              />

              <Pressable
                style={[
                  styles.btn,
                  (!input.trim() || loading) && styles.btnDisabled,
                ]}
                onPress={() => void generate()}
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Generate</Text>
                )}
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.outputCard}>
                <View style={styles.outputHeader}>
                  <Text style={styles.outputTitle}>Result</Text>
                  {output && !loading ? (
                    <View style={styles.outputActions}>
                      {toolId === "patient_friendly" && !editing ? (
                        <Pressable onPress={openTranslate}>
                          <Text style={styles.link}>Translate</Text>
                        </Pressable>
                      ) : null}
                      {toolId === "patient_friendly" ? (
                        <Pressable onPress={() => void handlePrint()} disabled={printing}>
                          <Text style={styles.link}>
                            {printing ? "Preparing…" : "Print"}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => setEditing((v) => !v)}>
                        <Text
                          style={[
                            styles.link,
                            editing && { color: colors.primary },
                          ]}
                        >
                          {editing ? "Done" : "Refine"}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => void handleCopy()}>
                        <Text style={styles.link}>
                          {copiedHint ? "Copied" : "Copy"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                {toolId === "digital_triage" && triageMeta ? (
                  <View style={styles.triageMeta}>
                    <View style={styles.triageMetaRow}>
                      <Text style={styles.triageMetaLabel}>Templates</Text>
                      <View style={styles.triageChips}>
                        {triageMeta.templateLabels.map((label) => (
                          <View
                            key={label}
                            style={[
                              styles.triageChip,
                              triageMeta.isGeneric
                                ? styles.triageChipCaution
                                : styles.triageChipTemplate,
                            ]}
                          >
                            <Text style={styles.triageChipText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {triageMeta.detectedTags.length > 0 ? (
                      <View style={styles.triageMetaRow}>
                        <Text style={styles.triageMetaLabel}>Detected</Text>
                        <View style={styles.triageChips}>
                          {triageMeta.detectedTags.map((tag) => (
                            <View
                              key={tag}
                              style={[styles.triageChip, styles.triageChipDetected]}
                            >
                              <Text style={styles.triageChipText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {triageMeta.highRiskFlags.length > 0 ? (
                      <View style={styles.triageMetaRow}>
                        <Text style={styles.triageMetaLabel}>
                          High-risk wording
                        </Text>
                        <View style={styles.triageChips}>
                          {triageMeta.highRiskFlags.map((flag) => (
                            <View
                              key={flag.id}
                              style={[styles.triageChip, styles.triageChipAlert]}
                            >
                              <Text style={styles.triageChipText}>{flag.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {loading && !output ? (
                  <View style={styles.skeletonBlock}>
                    <View style={[styles.skeletonLine, { width: "80%" }]} />
                    <View style={[styles.skeletonLine, { width: "95%" }]} />
                    <View style={[styles.skeletonLine, { width: "90%" }]} />
                    <View
                      style={[
                        styles.skeletonLine,
                        { width: "60%", marginTop: 12 },
                      ]}
                    />
                  </View>
                ) : output ? (
                  editing ? (
                    <TextInput
                      style={[styles.input, styles.outputEdit]}
                      multiline
                      value={output}
                      onChangeText={setOutput}
                    />
                  ) : (
                    <View>
                      {translatedOutput || translating ? (
                        <Text style={styles.paneLabel}>English</Text>
                      ) : null}
                      <Text style={styles.output} selectable>
                        {output}
                      </Text>

                      {translating || translatedOutput ? (
                        <View style={styles.translationPane}>
                          <Text
                            style={[styles.paneLabel, { color: colors.primary }]}
                          >
                            Translated
                          </Text>
                          {translating && !translatedOutput ? (
                            <ActivityIndicator
                              color={colors.primary}
                              style={{ marginTop: 8 }}
                            />
                          ) : (
                            <Text style={styles.output} selectable>
                              {translatedOutput}
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  )
                ) : (
                  <Text style={styles.emptyHint}>Output will appear here</Text>
                )}
              </View>
            </>
          )}

          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.link}>← Back to chat</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showTranslateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTranslateModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTranslateModal(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Translate Handout</Text>
              <Pressable onPress={() => setShowTranslateModal(false)} hitSlop={8}>
                <Text style={styles.clearLink}>Close</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Target Language</Text>
            <TextInput
              style={styles.langInput}
              value={targetLanguage}
              onChangeText={setTargetLanguage}
              placeholder="e.g., Spanish, Urdu, Polish..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              onSubmitEditing={() => void translate(targetLanguage)}
              returnKeyType="done"
            />

            {recentLanguages.length > 0 ? (
              <View style={styles.recentLangBlock}>
                <Text style={styles.recentLangLabel}>Recently Used</Text>
                <View style={styles.recentLangRow}>
                  {recentLanguages.map((lang) => (
                    <Pressable
                      key={lang}
                      style={styles.langChip}
                      onPress={() => void translate(lang)}
                    >
                      <Text style={styles.langChipText}>{lang}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.btn,
                styles.translateBtn,
                !targetLanguage.trim() && styles.btnDisabled,
              ]}
              onPress={() => void translate(targetLanguage)}
              disabled={!targetLanguage.trim() || translating}
            >
              <Text style={styles.btnText}>Translate</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg },
    headerAction: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.textMuted,
      marginRight: 4,
    },
    toolRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    chipText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.textMuted,
    },
    chipTextActive: { color: colors.primary },
    desc: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    inputHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
      gap: 12,
    },
    inputHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexShrink: 1,
      flexWrap: "wrap",
    },
    sectionLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
    },
    modeToggle: {
      flexDirection: "row",
      backgroundColor: colors.hoverBg,
      borderRadius: 6,
      padding: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 4,
    },
    modeBtnActive: {
      backgroundColor: colors.surface,
    },
    modeBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.textMuted,
    },
    modeBtnTextActive: { color: colors.primary },
    clearLink: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.textMuted,
    },
    input: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      padding: 12,
      backgroundColor: colors.surface,
      fontSize: 15,
      color: colors.text,
      fontFamily: fonts.regular,
      textAlignVertical: "top",
      // Suppress RN Web's default black focus outline. No-op on native.
      outlineWidth: 0,
    },
    btn: {
      marginTop: spacing.md,
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    translateBtn: {
      alignSelf: "stretch",
      alignItems: "center",
      marginTop: spacing.sm,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: "#fff", fontFamily: fonts.bold },
    error: {
      marginTop: spacing.md,
      color: colors.danger,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    outputCard: {
      marginTop: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      minHeight: 120,
    },
    outputHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
      gap: 8,
    },
    outputActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
      justifyContent: "flex-end",
      flexShrink: 1,
    },
    outputTitle: { fontFamily: fonts.bold, color: colors.text },
    triageMeta: {
      gap: 8,
      marginBottom: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.hoverBg,
    },
    triageMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: 8,
    },
    triageMetaLabel: {
      flexBasis: 100,
      fontFamily: fonts.semiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: colors.textMuted,
      paddingTop: 4,
    },
    triageChips: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    triageChip: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    triageChipText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.text,
    },
    triageChipTemplate: {
      backgroundColor: `${colors.primary}1f`,
      borderColor: `${colors.primary}59`,
    },
    triageChipCaution: {
      backgroundColor: "rgba(180,83,9,0.12)",
      borderColor: "rgba(180,83,9,0.4)",
    },
    triageChipDetected: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    triageChipAlert: {
      backgroundColor: "rgba(185,28,28,0.12)",
      borderColor: "rgba(185,28,28,0.45)",
    },
    output: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 22,
      color: colors.text,
    },
    outputEdit: {
      minHeight: 200,
      borderStyle: "dashed",
      borderColor: colors.primary,
    },
    paneLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    translationPane: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    skeletonBlock: { gap: 12, paddingVertical: 4 },
    skeletonLine: {
      height: 14,
      borderRadius: 4,
      backgroundColor: colors.hoverBg,
    },
    emptyHint: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textMuted,
      opacity: 0.7,
      textAlign: "center",
      paddingVertical: spacing.lg,
    },
    historyList: { marginTop: spacing.md, gap: 12 },
    historyCard: {
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
    },
    historyCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
      gap: 8,
    },
    historyName: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.primary,
      flexShrink: 1,
    },
    historyDate: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
    },
    historyPreview: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
    },
    link: { color: colors.primary, fontFamily: fonts.bold, fontSize: 13 },
    back: { marginTop: spacing.lg },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    modalCard: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    modalTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 17,
      color: colors.text,
    },
    fieldLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 6,
    },
    langInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: spacing.md,
      // Suppress RN Web's default black focus outline. No-op on native.
      outlineWidth: 0,
    },
    recentLangBlock: { marginBottom: spacing.md },
    recentLangLabel: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
    },
    recentLangRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    langChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    langChipText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.text,
    },
  });
