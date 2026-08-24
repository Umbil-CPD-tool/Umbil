import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { streamReflection } from "@/lib/api";
import { addCPD } from "@/lib/store/cpd";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const GMC_CLUSTERS = [
  "Knowledge Skills & Performance",
  "Safety & Quality",
  "Communication Partnership & Teamwork",
  "Maintaining Trust",
];

const DURATION_OPTIONS = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hrs" },
  { value: 120, label: "2 hrs" },
] as const;

type AiMode = "structured_reflection" | "personalise";

const cleanMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/`/g, "")
    .replace(/\[|\]/g, "")
    .trim();
};

const isLimitReached = (message: string): boolean =>
  message === "LIMIT_REACHED" || message.includes("LIMIT_REACHED");

const paramString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default function CaptureLearningScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{
    question?: string;
    answer?: string;
    conversationId?: string;
  }>();

  const question = paramString(params.question) || "Manual Entry";
  const answer = paramString(params.answer);
  const conversationId = paramString(params.conversationId) || null;
  const hasContext = Boolean(paramString(params.question) || answer);

  const [reflection, setReflection] = useState("");
  const [tags, setTags] = useState("");
  const [duration, setDuration] = useState(10);
  const [isOptionalOpen, setIsOptionalOpen] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [isGenerating, setIsGenerating] = useState<AiMode | null>(null);
  const [saving, setSaving] = useState(false);

  const cpdContext = {
    question,
    answer,
    conversationId,
  };

  const showProLimitAlert = (featureName: string) => {
    Alert.alert(
      "Upgrade to Pro",
      `You've reached the free limit for ${featureName}. Upgrade to Pro for unlimited access.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Upgrade",
          onPress: () => router.push("/(app)/pro"),
        },
      ]
    );
  };

  const toggleTag = (tagToToggle: string) => {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const existingIndex = tagList.findIndex(
      (t) => t.toLowerCase() === tagToToggle.toLowerCase()
    );
    if (existingIndex > -1) {
      tagList.splice(existingIndex, 1);
    } else {
      tagList.push(tagToToggle);
    }
    setTags(tagList.join(", "));
  };

  const isTagActive = (tag: string) => {
    const current = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return current.includes(tag.toLowerCase());
  };

  const handleAiAction = async (mode: AiMode) => {
    if (!reflection && !hasContext) return;
    if (mode === "personalise" && !reflection.trim()) {
      Alert.alert(
        "Add notes first",
        "Write your rough notes, then tap Fix grammar & flow."
      );
      return;
    }

    setIsGenerating(mode);
    try {
      if (mode === "structured_reflection") setReflection("");

      await streamReflection({
        body: {
          mode,
          userNotes: reflection,
          context: cpdContext,
        },
        onChunk: (text) => {
          let display = text;
          if (display.includes("---TAGS---")) {
            display = display.split("---TAGS---")[0] ?? display;
          }
          setReflection(cleanMarkdown(display));
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate text.";
      if (isLimitReached(message)) {
        showProLimitAlert(
          mode === "structured_reflection" ? "AI Reflections" : "AI Grammar Tidy"
        );
      } else {
        Alert.alert("AI failed", "Failed to generate text. Please try again.");
      }
    } finally {
      setIsGenerating(null);
    }
  };

  const generateTags = async () => {
    if (suggestedTags.length > 0 || (!reflection && !hasContext)) return;

    setLoadingTags(true);
    try {
      let resultText = "";
      await streamReflection({
        body: {
          mode: "generate_tags",
          userNotes: reflection,
          context: cpdContext,
        },
        onChunk: (text) => {
          resultText = text;
        },
      });

      const newTags = resultText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      setSuggestedTags(newTags);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isLimitReached(message)) {
        showProLimitAlert("AI Tag Generation");
      }
    } finally {
      setLoadingTags(false);
    }
  };

  const handleToggleStructure = () => {
    const next = !isOptionalOpen;
    setIsOptionalOpen(next);
    if (next) {
      void generateTags();
    }
  };

  const handleSave = async () => {
    if (!reflection.trim()) {
      Alert.alert("Reflection needed", "Please add a reflection before saving.");
      return;
    }

    setSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await addCPD({
        timestamp: new Date().toISOString(),
        question: question || "Manual Entry",
        answer: answer || "",
        reflection: reflection.trim(),
        tags: tagList,
        duration,
      });

      if (error) {
        if (isLimitReached(error.message || "")) {
          showProLimitAlert("Learning Log Saves");
          return;
        }
        Alert.alert("Save failed", error.message || "Failed to save learning.");
        return;
      }

      if (conversationId) {
        router.replace({
          pathname: "/(app)/(drawer)/chat",
          params: { c: conversationId, cpdSaved: "true" },
        });
      } else {
        router.replace("/(app)/(drawer)/cpd");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (conversationId) {
      router.replace({
        pathname: "/(app)/(drawer)/chat",
        params: { c: conversationId },
      });
    } else {
      router.back();
    }
  };

  const aiBusy = !!isGenerating;
  const canAutoGenerate = !aiBusy && (!!reflection.trim() || hasContext);
  const canFixGrammar = !aiBusy && !!reflection.trim();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Capture learning",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>
              Capture what you've just learned.
            </Text>
            <Text style={styles.heroSubtitle}>
              Saved privately. Use later for study, training, or appraisal.
            </Text>
          </View>

          <View style={styles.aiRow}>
            <Pressable
              onPress={() => void handleAiAction("structured_reflection")}
              disabled={!canAutoGenerate}
              style={[
                styles.aiButton,
                styles.aiButtonPrimary,
                !canAutoGenerate && styles.disabled,
              ]}
            >
              {isGenerating === "structured_reflection" ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.aiButtonTextPrimary}>
                  Auto-generate reflection
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => void handleAiAction("personalise")}
              disabled={!canFixGrammar}
              style={[styles.aiButton, !canFixGrammar && styles.disabled]}
            >
              {isGenerating === "personalise" ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.aiButtonText}>Fix grammar & flow</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.label}>Reflection notes</Text>
          <TextInput
            style={[styles.input, styles.reflectionInput]}
            multiline
            value={reflection}
            onChangeText={setReflection}
            placeholder="What did you learn or discuss?"
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
          />

          <Pressable
            style={[
              styles.saveButton,
              (saving || !reflection.trim()) && styles.disabled,
            ]}
            onPress={() => void handleSave()}
            disabled={saving || !reflection.trim()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save to Learning Log</Text>
            )}
          </Pressable>

          <Text style={styles.exportHint}>
            You can export this to FourteenFish, Turas, or any portfolio later.
          </Text>

          <View style={styles.structureDivider}>
            <Pressable onPress={handleToggleStructure} style={styles.structureToggle}>
              <Text style={styles.structureToggleText}>
                {isOptionalOpen
                  ? "− Hide details"
                  : "+ Add structure (optional)"}
              </Text>
            </Pressable>

            {isOptionalOpen ? (
              <View style={styles.structureBody}>
                {(suggestedTags.length > 0 || loadingTags) && (
                  <View style={styles.field}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Suggested Tags</Text>
                      {loadingTags ? (
                        <ActivityIndicator color={colors.textMuted} size="small" />
                      ) : null}
                    </View>
                    <View style={styles.chips}>
                      {suggestedTags.map((tag) => {
                        const active = isTagActive(tag);
                        return (
                          <Pressable
                            key={tag}
                            onPress={() => toggleTag(tag)}
                            style={[
                              styles.suggestedChip,
                              active && styles.suggestedChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.suggestedChipText,
                                active && styles.suggestedChipTextActive,
                              ]}
                            >
                              {active ? `✓ ${tag}` : tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.label}>GMC Domain Tags</Text>
                  <View style={styles.chips}>
                    {GMC_CLUSTERS.map((tag) => {
                      const active = isTagActive(tag);
                      return (
                        <Pressable
                          key={tag}
                          onPress={() => toggleTag(tag)}
                          style={[styles.gmcChip, active && styles.gmcChipActive]}
                        >
                          <Text
                            style={[
                              styles.gmcChipText,
                              active && styles.gmcChipTextActive,
                            ]}
                          >
                            {active ? `✓ ${tag}` : `+ ${tag}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Additional Tags (comma-separated)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="e.g., cardiology, guidelines"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Time Spent</Text>
                  <View style={styles.chips}>
                    {DURATION_OPTIONS.map((opt) => {
                      const active = duration === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setDuration(opt.value)}
                          style={[
                            styles.durationChip,
                            active && styles.durationChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.durationChipText,
                              active && styles.durationChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          <Pressable onPress={handleCancel} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Cancel and return to chat</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: spacing.lg,
      paddingBottom: 64,
      maxWidth: 700,
      width: "100%",
      alignSelf: "center",
    },
    hero: {
      marginBottom: spacing.lg,
      alignItems: "center",
    },
    heroTitle: {
      fontFamily: fonts.bold,
      fontSize: 26,
      lineHeight: 32,
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    heroSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: "center",
    },
    aiRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: spacing.sm,
    },
    aiButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 40,
      justifyContent: "center",
    },
    aiButtonPrimary: {
      borderColor: colors.primary,
    },
    aiButtonText: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.text,
    },
    aiButtonTextPrimary: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.primary,
    },
    label: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: 16,
      backgroundColor: colors.surface,
      color: colors.text,
      fontFamily: fonts.regular,
      fontSize: 16,
      // Suppress RN Web's default black focus outline. No-op on native.
      outlineWidth: 0,
    },
    reflectionInput: {
      minHeight: 160,
      marginBottom: spacing.md,
      lineHeight: 24,
    },
    saveButton: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: radii.lg,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      marginBottom: spacing.sm,
    },
    saveButtonText: {
      color: "#fff",
      fontFamily: fonts.bold,
      fontSize: 16,
    },
    exportHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    structureDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    structureToggle: {
      alignItems: "center",
      paddingVertical: 8,
    },
    structureToggleText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.primary,
    },
    structureBody: {
      marginTop: spacing.md,
      gap: spacing.md,
    },
    field: {
      marginBottom: 4,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    suggestedChip: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },
    suggestedChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    suggestedChipText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.primary,
    },
    suggestedChipTextActive: {
      color: "#fff",
    },
    gmcChip: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: "transparent",
      maxWidth: "100%",
    },
    gmcChipActive: {
      borderStyle: "solid",
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    gmcChipText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textMuted,
    },
    gmcChipTextActive: {
      color: "#fff",
    },
    durationChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    durationChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    durationChipText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textMuted,
    },
    durationChipTextActive: {
      color: colors.primary,
      fontFamily: fonts.semiBold,
    },
    cancelLink: {
      marginTop: spacing.xl,
      alignItems: "center",
      paddingVertical: 8,
    },
    cancelText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textMuted,
      textDecorationLine: "underline",
    },
    disabled: {
      opacity: 0.55,
    },
  });
