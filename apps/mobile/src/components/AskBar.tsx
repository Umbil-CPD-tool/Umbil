import { Ionicons } from "@expo/vector-icons";
import { ANSWER_STYLES, type AnswerStyle, WORKFLOW_TOOLS } from "@umbil/shared";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDictation } from "@/lib/dictation";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

const STYLE_META: Record<
  AnswerStyle,
  { label: string; description: string }
> = {
  standard: { label: "Standard", description: "Balanced, concise answer." },
  clinic: { label: "Clinic", description: "Bullet points, rapid actions." },
  deepDive: { label: "Deep Dive", description: "Detailed evidence review." },
};

type AskBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  loading?: boolean;
  answerStyle: AnswerStyle;
  onAnswerStyleChange: (style: AnswerStyle) => void;
  onToolSelect: (toolId: string) => void;
};

export const AskBar = ({
  value,
  onChangeText,
  onSend,
  loading,
  answerStyle,
  onAnswerStyleChange,
  onToolSelect,
}: AskBarProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const { isListening, dictationError, handleMicPress } = useDictation(
    value,
    onChangeText
  );
  const styles = makeStyles(colors);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isListening) {
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(0);
    };
  }, [isListening, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View
      style={[
        styles.bar,
        focused && styles.barFocused,
      ]}
    >
      <TextInput
        style={styles.textarea}
        placeholder="Ask Umbil anything..."
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline
        editable={!loading}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      {dictationError && (
        <Text style={styles.dictationError}>{dictationError}</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.toolsBtn}
          onPress={() => setToolsOpen(true)}
          accessibilityLabel="Medical Tools"
        >
          <Text style={styles.toolsEmoji}>✨</Text>
          <Text style={styles.toolsLabel}>Tools</Text>
        </Pressable>

        <View style={styles.rightActions}>
          <Pressable
            style={styles.styleBtn}
            onPress={() => setStyleOpen(true)}
            accessibilityLabel="Change answer style"
          >
            <Text style={styles.styleLabel}>
              {STYLE_META[answerStyle].label}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.iconBtn, isListening && styles.iconBtnListening]}
            onPress={handleMicPress}
            disabled={loading}
            accessibilityLabel={isListening ? "Stop dictation" : "Start dictation"}
          >
            {isListening && (
              <Animated.View
                style={[
                  styles.micPing,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
            )}
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={20}
              color={isListening ? colors.primary : colors.textMuted}
            />
          </Pressable>

          <Pressable
            style={[
              styles.sendBtn,
              (!value.trim() || loading) && styles.sendDisabled,
            ]}
            onPress={onSend}
            disabled={!value.trim() || loading}
            accessibilityLabel="Send"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <Modal visible={toolsOpen} transparent animationType="fade">
        <Pressable
          style={[
            styles.overlay,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          onPress={() => setToolsOpen(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Medical Tools</Text>
            {WORKFLOW_TOOLS.map((tool) => (
              <Pressable
                key={tool.id}
                style={styles.menuItem}
                onPress={() => {
                  setToolsOpen(false);
                  onToolSelect(tool.id);
                }}
              >
                <Text style={styles.menuItemText}>{tool.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={styleOpen} transparent animationType="fade">
        <Pressable
          style={[
            styles.overlay,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          onPress={() => setStyleOpen(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Answer style</Text>
            {ANSWER_STYLES.map((style) => (
              <Pressable
                key={style.id}
                style={[
                  styles.menuItem,
                  answerStyle === style.id && styles.menuItemActive,
                ]}
                onPress={() => {
                  onAnswerStyleChange(style.id);
                  setStyleOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.menuItemStrong,
                    answerStyle === style.id && styles.menuItemStrongActive,
                  ]}
                >
                  {STYLE_META[style.id].label}
                </Text>
                <Text style={styles.menuItemDesc}>
                  {STYLE_META[style.id].description}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    bar: {
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: "rgba(31, 184, 205, 0.3)",
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    barFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    textarea: {
      minHeight: 28,
      maxHeight: 160,
      fontFamily: fonts.regular,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
      textAlignVertical: "top",
      padding: 0,
      marginBottom: spacing.sm,
      // Suppress RN Web's default black focus outline; `barFocused` above
      // already provides a colored focus affordance. No-op on native.
      outlineWidth: 0,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toolsBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.hoverBg,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 44,
    },
    toolsEmoji: { fontSize: 16 },
    toolsLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
    },
    rightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    styleBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.sm,
      minHeight: 44,
    },
    styleLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.textMuted,
    },
    iconBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.sm,
      position: "relative",
    },
    iconBtnListening: {
      backgroundColor: colors.primaryMuted,
    },
    micPing: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
    },
    dictationError: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.danger,
      marginBottom: spacing.sm,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.sm,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendDisabled: { opacity: 0.4 },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
      padding: spacing.lg,
    },
    menu: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
    },
    menuTitle: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    menuItem: {
      minHeight: 44,
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 4,
    },
    menuItemActive: {
      backgroundColor: colors.hoverBg,
    },
    menuItemText: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.text,
    },
    menuItemStrong: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.text,
    },
    menuItemStrongActive: {
      color: colors.primary,
    },
    menuItemDesc: {
      marginTop: 2,
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
