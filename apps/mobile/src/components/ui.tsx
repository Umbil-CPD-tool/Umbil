import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors, radii, spacing } from "@/theme/colors";

export const Screen = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => <View style={[styles.screen, style]}>{children}</View>;

export const Title = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.title}>{children}</Text>
);

export const Subtitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.subtitle}>{children}</Text>
);

export const Field = ({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      autoCapitalize="none"
      {...props}
    />
  </View>
);

export const Button = ({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  align = "stretch",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  /** Web auth uses a right-aligned primary action. */
  align?: "stretch" | "end";
}) => (
  <View style={align === "end" ? styles.buttonRowEnd : undefined}>
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        align === "end" && styles.buttonAuto,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#fff" : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant !== "primary" && styles.buttonTextSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  </View>
);

export const Message = ({
  text,
  tone = "info",
}: {
  text: string;
  tone?: "info" | "error" | "success";
}) => (
  <View
    style={[
      styles.message,
      tone === "error" && styles.messageError,
      tone === "success" && styles.messageSuccess,
    ]}
  >
    <Text
      style={[
        styles.messageText,
        tone === "error" && { color: colors.danger },
        tone === "success" && { color: colors.success },
        tone === "info" && { color: colors.primary },
      ]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    // Web (RN Web) draws its own black focus ring on inputs; zero it out here
    // so the existing border-color focus affordance stays the only indicator.
    // No-op on native.
    outlineWidth: 0,
  },
  buttonRowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonAuto: {
    alignSelf: "flex-end",
    minWidth: 120,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    backgroundColor: colors.primaryHover,
    borderColor: colors.primaryHover,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  message: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  messageError: {
    backgroundColor: colors.dangerMuted,
  },
  messageSuccess: {
    backgroundColor: colors.successMuted,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
