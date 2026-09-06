import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDED_REFLECTION_PROMPTS,
  emptyGuidedReflectionAnswers,
  hasGuidedReflectionAnswer,
  seedLearnedFromNotes,
  type GuidedReflectionAnswers,
} from "@umbil/shared";

import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type HelpMeReflectSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  initialLearned?: string;
  sourceQuestion?: string;
  resetNonce?: number;
  isSubmitting?: boolean;
  onSubmit: (answers: GuidedReflectionAnswers) => void;
};

export const HelpMeReflectSheet = ({
  isOpen,
  onClose,
  initialLearned = "",
  sourceQuestion = "",
  resetNonce = 0,
  isSubmitting = false,
  onSubmit,
}: HelpMeReflectSheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [answers, setAnswers] = useState<GuidedReflectionAnswers>(
    emptyGuidedReflectionAnswers()
  );
  const seedLearnedRef = useRef(initialLearned);
  seedLearnedRef.current = initialLearned;

  useEffect(() => {
    setAnswers({
      ...emptyGuidedReflectionAnswers(),
      learned: seedLearnedFromNotes(seedLearnedRef.current),
    });
  }, [resetNonce]);

  useEffect(() => {
    if (!isOpen) return;
    setAnswers((prev) => {
      if (hasGuidedReflectionAnswer(prev)) return prev;
      return {
        ...emptyGuidedReflectionAnswers(),
        learned: seedLearnedFromNotes(seedLearnedRef.current),
      };
    });
  }, [isOpen]);

  const canSubmit = hasGuidedReflectionAnswer(answers) && !isSubmitting;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!isSubmitting) onClose();
          }}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Help me reflect</Text>
          <Text style={styles.intro}>
            Answer in your own words. Umbil will structure this as Learning,
            Application, and Next steps — it will not invent clinical detail.
            You can leave a prompt blank.
          </Text>
          {sourceQuestion.trim() && sourceQuestion !== "Manual Entry" ? (
            <View style={styles.contextBox}>
              <Text style={styles.contextLabel}>Reflecting on</Text>
              <Text style={styles.contextText} numberOfLines={3}>
                {sourceQuestion.trim()}
              </Text>
            </View>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            style={styles.formScroll}
            contentContainerStyle={styles.form}
          >
            {GUIDED_REFLECTION_PROMPTS.map((prompt, index) => (
              <View key={prompt.id} style={styles.field}>
                <Text style={styles.label}>
                  {index + 1}. {prompt.title}
                </Text>
                <Text style={styles.hint}>{prompt.hint}</Text>
                <TextInput
                  style={styles.input}
                  multiline
                  value={answers[prompt.id]}
                  onChangeText={(value) =>
                    setAnswers((prev) => ({ ...prev, [prompt.id]: value }))
                  }
                  placeholder="A sentence or two is enough."
                  placeholderTextColor={colors.textMuted}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              style={[styles.secondaryBtn, isSubmitting && styles.disabled]}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(answers)}
              disabled={!canSubmit}
              style={[styles.primaryBtn, !canSubmit && styles.disabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryText}>Structure my reflection</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    flex: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: "92%",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.text,
      marginBottom: 8,
    },
    intro: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    contextBox: {
      backgroundColor: colors.background,
      borderRadius: radii.sm,
      padding: 12,
      marginBottom: spacing.md,
    },
    contextLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 4,
    },
    contextText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    formScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    form: {
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    field: { gap: 6 },
    label: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.text,
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    input: {
      minHeight: 88,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: 14,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: fonts.regular,
      fontSize: 16,
      lineHeight: 22,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      paddingTop: spacing.sm,
    },
    secondaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.text,
    },
    primaryBtn: {
      flex: 1.4,
      minHeight: 48,
      borderRadius: radii.lg,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    primaryText: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: "#fff",
      textAlign: "center",
    },
    disabled: { opacity: 0.55 },
  });
