import { Ionicons } from "@expo/vector-icons";
import { WORKFLOW_TOOLS } from "@umbil/shared";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";

import { reportContent, streamTool } from "@/lib/api";
import { analyzeTriageInput, type TriageAnalysis } from "@/lib/digitalTriage";
import { printHandout } from "@/lib/printHandout";
import { getSupabase } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/stream";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const TOOL_LABELS: Record<string, string> = WORKFLOW_TOOLS.reduce(
  (acc, tool) => ({ ...acc, [tool.id]: tool.label }),
  {} as Record<string, string>
);

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

type Props = {
  message: ChatMessage;
  streaming: boolean;
  onCaptureLearning: () => void;
  onRegenerate?: () => void;
  onDeepDive?: () => void;
  isLastAssistant?: boolean;
};

export const ChatMessageBubble = ({
  message,
  streaming,
  onCaptureLearning,
  onRegenerate,
  onDeepDive,
  isLastAssistant,
}: Props) => {
  const { colors, isDark } = useTheme();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [translatedOutput, setTranslatedOutput] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentLanguages, setRecentLanguages] = useState<string[]>([]);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [printing, setPrinting] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const markdownStyles = useMemo(
    () => makeMarkdownStyles(colors),
    [colors]
  );

  const isUser = message.role === "user";
  const isToolCall = message.role === "assistant" && !!message.toolId;
  const showActions =
    message.role === "assistant" && !!message.content && !streaming;

  const triageMeta: TriageAnalysis | null = useMemo(() => {
    if (message.toolId !== "digital_triage" || !message.question) return null;
    return analyzeTriageInput(message.question);
  }, [message.toolId, message.question]);

  useEffect(() => {
    setEditedContent(message.content);
  }, [message.content]);

  useEffect(() => {
    if (message.toolId !== "patient_friendly") return;
    void (async () => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) return;
      const { data } = await getSupabase()
        .from("profiles")
        .select("recent_languages")
        .eq("id", user.id)
        .single();
      if (data?.recent_languages && Array.isArray(data.recent_languages)) {
        setRecentLanguages(data.recent_languages as string[]);
      }
    })();
  }, [message.toolId]);

  const outputForCopy = isToolCall ? editedContent : message.content;

  const copy = async () => {
    await Clipboard.setStringAsync(
      isToolCall
        ? translatedOutput
          ? `--- ENGLISH ---\n\n${stripMarkdown(outputForCopy)}\n\n--- TRANSLATION ---\n\n${stripMarkdown(translatedOutput)}`
          : stripMarkdown(outputForCopy)
        : message.content
    );
    Alert.alert("Copied", "Answer copied to clipboard.");
  };

  const share = async () => {
    await Share.share({ message: message.content });
  };

  const persistRecentLanguage = (lang: string) => {
    const next = Array.from(new Set([lang, ...recentLanguages])).slice(0, 5);
    setRecentLanguages(next);
    void (async () => {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) return;
      const { error } = await getSupabase()
        .from("profiles")
        .update({ recent_languages: next })
        .eq("id", user.id);
      if (error) console.error("Failed to save language preference:", error);
    })();
  };

  const translate = async (langToUse: string) => {
    const lang = langToUse.trim();
    if (!outputForCopy.trim() || !lang || isTranslating) return;
    setShowTranslateModal(false);
    setIsTranslating(true);
    setTranslatedOutput("");
    persistRecentLanguage(lang);
    try {
      await streamTool({
        toolType: "translate_handout",
        input: outputForCopy,
        targetLanguage: lang,
        onChunk: setTranslatedOutput,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not translate";
      Alert.alert("Translate failed", msg);
      setTranslatedOutput("Error translating content. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const openTranslate = () => {
    setTargetLanguage(recentLanguages[0] ?? "");
    setShowTranslateModal(true);
  };

  const handlePrint = async () => {
    if (!outputForCopy.trim() || printing) return;
    setPrinting(true);
    try {
      await printHandout({
        title: TOOL_LABELS[message.toolId!] ?? "Patient Handout",
        output: outputForCopy,
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

  const submitReport = async () => {
    if (!reason.trim()) {
      Alert.alert("Add a reason", "Please describe the issue.");
      return;
    }
    try {
      await reportContent({
        question: message.question || "",
        answer: message.content,
        reason: reason.trim(),
      });
      setReporting(false);
      setReason("");
      Alert.alert("Thanks", "Your report was submitted.");
    } catch (err) {
      Alert.alert(
        "Report failed",
        err instanceof Error ? err.message : "Could not submit report"
      );
    }
  };

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
      {isUser ? (
        <Text style={[styles.bubbleText, styles.userBubbleText]} selectable>
          {message.content || (streaming ? "…" : "")}
        </Text>
      ) : isToolCall ? (
        <View>
          <View style={styles.toolCardHeader}>
            <Text style={styles.toolTag}>{TOOL_LABELS[message.toolId!] ?? message.toolId}</Text>
            {message.content && !streaming ? (
              <View style={styles.toolCardActions}>
                {message.toolId === "patient_friendly" && !isEditing ? (
                  <Pressable onPress={openTranslate} hitSlop={6}>
                    <Text style={styles.toolCardLink}>Translate</Text>
                  </Pressable>
                ) : null}
                {message.toolId === "patient_friendly" ? (
                  <Pressable onPress={() => void handlePrint()} hitSlop={6} disabled={printing}>
                    <Text style={styles.toolCardLink}>
                      {printing ? "Preparing…" : "Print"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setIsEditing((v) => !v)} hitSlop={6}>
                  <Text
                    style={[
                      styles.toolCardLink,
                      isEditing && { color: colors.primary },
                    ]}
                  >
                    {isEditing ? "Done" : "Refine"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {message.toolId === "digital_triage" && triageMeta ? (
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
                      <View key={tag} style={[styles.triageChip, styles.triageChipDetected]}>
                        <Text style={styles.triageChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {triageMeta.highRiskFlags.length > 0 ? (
                <View style={styles.triageMetaRow}>
                  <Text style={styles.triageMetaLabel}>High-risk wording</Text>
                  <View style={styles.triageChips}>
                    {triageMeta.highRiskFlags.map((flag) => (
                      <View key={flag.id} style={[styles.triageChip, styles.triageChipAlert]}>
                        <Text style={styles.triageChipText}>{flag.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {isEditing ? (
            <TextInput
              style={styles.toolCardEditInput}
              multiline
              value={editedContent}
              onChangeText={setEditedContent}
            />
          ) : (
            <>
              {translatedOutput || isTranslating ? (
                <Text style={styles.paneLabel}>English</Text>
              ) : null}
              <Markdown style={markdownStyles} mergeStyle>
                {editedContent || (streaming ? "…" : "")}
              </Markdown>

              {isTranslating || translatedOutput ? (
                <View style={styles.translationPane}>
                  <Text style={[styles.paneLabel, { color: colors.primary }]}>
                    Translated
                  </Text>
                  {isTranslating && !translatedOutput ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
                  ) : (
                    <Markdown style={markdownStyles} mergeStyle>
                      {translatedOutput}
                    </Markdown>
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : (
        <Markdown style={markdownStyles} mergeStyle>
          {message.content || (streaming ? "…" : "")}
        </Markdown>
      )}

      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => void share()}
            style={styles.action}
            accessibilityLabel="Share"
          >
            <Ionicons
              name="share-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>

          <Pressable
            onPress={() => void copy()}
            style={styles.action}
            accessibilityLabel="Copy"
          >
            <Ionicons
              name="copy-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.actionText}>Copy</Text>
          </Pressable>

          {isLastAssistant && onDeepDive && message.question ? (
            <Pressable
              onPress={onDeepDive}
              style={styles.action}
              accessibilityLabel="Deep dive"
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.actionText}>Deep Dive</Text>
            </Pressable>
          ) : null}

          {isLastAssistant && onRegenerate ? (
            <Pressable
              onPress={onRegenerate}
              style={styles.action}
              accessibilityLabel="Regenerate"
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.actionText}>Regenerate</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onCaptureLearning}
            style={styles.action}
            accessibilityLabel="Capture learning"
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.captureText}>Capture learning</Text>
          </Pressable>

          <Pressable
            onPress={() => setReporting((v) => !v)}
            style={styles.action}
            accessibilityLabel="Report"
          >
            <Ionicons name="flag-outline" size={16} color="#9ca3af" />
          </Pressable>
        </View>
      ) : null}

      {reporting ? (
        <View style={styles.reportBox}>
          <TextInput
            style={styles.reportInput}
            placeholder="What's wrong with this answer?"
            placeholderTextColor={colors.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Pressable
            style={styles.reportBtn}
            onPress={() => void submitReport()}
          >
            <Text style={styles.reportBtnText}>Submit report</Text>
          </Pressable>
        </View>
      ) : null}

      {isToolCall ? (
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
                <Pressable
                  onPress={() => setShowTranslateModal(false)}
                  hitSlop={8}
                >
                  <Text style={styles.toolCardLink}>Close</Text>
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
                  styles.reportBtn,
                  { alignSelf: "stretch", alignItems: "center" },
                  !targetLanguage.trim() && { opacity: 0.5 },
                ]}
                onPress={() => void translate(targetLanguage)}
                disabled={!targetLanguage.trim() || isTranslating}
              >
                <Text style={styles.reportBtnText}>Translate</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
};

const makeMarkdownStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    body: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
    },
    strong: { fontFamily: fonts.bold },
    em: { fontStyle: "italic" },
    heading1: {
      fontFamily: fonts.bold,
      fontSize: 20,
      marginTop: 12,
      marginBottom: 4,
      color: colors.text,
    },
    heading2: {
      fontFamily: fonts.bold,
      fontSize: 18,
      marginTop: 12,
      marginBottom: 4,
      color: colors.text,
    },
    heading3: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      marginTop: 8,
      marginBottom: 4,
      color: colors.text,
    },
    paragraph: { marginTop: 0, marginBottom: 12 },
    bullet_list: { marginVertical: 8 },
    ordered_list: { marginVertical: 8 },
    list_item: { marginVertical: 4 },
    code_inline: {
      fontFamily: fonts.medium,
      backgroundColor: colors.hoverBg,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    fence: {
      fontFamily: fonts.regular,
      backgroundColor: colors.hoverBg,
      padding: 10,
      borderRadius: radii.sm,
      marginVertical: 6,
    },
    link: { color: colors.primary },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 8,
      borderRadius: 8,
    },
    th: {
      fontFamily: fonts.semiBold,
      padding: 10,
      backgroundColor: colors.hoverBg,
    },
    td: { fontFamily: fonts.regular, padding: 10, fontSize: 14 },
    tr: { borderBottomWidth: 1, borderColor: colors.border },
  });

const makeStyles = (colors: ColorPalette, isDark: boolean) =>
  StyleSheet.create({
    bubble: {
      maxWidth: "92%",
      borderRadius: radii.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    userBubble: {
      alignSelf: "flex-end",
      backgroundColor: isDark ? "#004d4d" : "#e6f7ff",
    },
    botBubble: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    toolTag: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: colors.primary,
      textTransform: "uppercase",
    },
    toolCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      gap: 8,
    },
    toolCardActions: {
      flexDirection: "row",
      gap: 14,
    },
    toolCardLink: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.primary,
    },
    toolCardEditInput: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.primary,
      borderRadius: radii.sm,
      padding: 10,
      minHeight: 160,
      textAlignVertical: "top",
      color: colors.text,
      backgroundColor: colors.background,
      fontFamily: fonts.regular,
      // Suppress RN Web's default black focus outline. No-op on native.
      outlineWidth: 0,
      fontSize: 15,
      lineHeight: 22,
    },
    paneLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 4,
    },
    translationPane: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    triageMeta: {
      gap: 8,
      marginBottom: 10,
      padding: 10,
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
    bubbleText: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
    },
    userBubbleText: {
      color: colors.text,
      fontFamily: fonts.regular,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    actionText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textMuted,
    },
    captureText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.primary,
    },
    reportBox: { marginTop: spacing.sm },
    reportInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      padding: 10,
      minHeight: 64,
      textAlignVertical: "top",
      color: colors.text,
      backgroundColor: colors.background,
      fontFamily: fonts.regular,
      // Suppress RN Web's default black focus outline. No-op on native.
      outlineWidth: 0,
    },
    reportBtn: {
      marginTop: 8,
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    reportBtnText: {
      color: "#fff",
      fontFamily: fonts.bold,
      fontSize: 13,
    },
  });
