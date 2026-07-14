import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  left?: ReactNode;
};

export function Button({
  label,
  loading = false,
  variant = 'primary',
  left,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        styles[`button_${variant}`],
        state.pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.teal : colors.white}
        />
      ) : (
        <View style={styles.buttonContent}>
          {left}
          <Text style={[styles.buttonLabel, styles[`buttonLabel_${variant}`]]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  helper,
  error,
  multiline,
  style,
  ...props
}: TextInputProps & {
  label: string;
  helper?: string;
  error?: string | null;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.inputMultiline, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
}

export function Pill({ label, tone = 'teal' }: { label: string; tone?: 'teal' | 'success' | 'muted' }) {
  const palette = {
    teal: { backgroundColor: colors.tealSoft, color: colors.tealDark },
    success: { backgroundColor: colors.successSoft, color: colors.success },
    muted: { backgroundColor: colors.subtle, color: colors.muted },
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}> 
      <Text style={[styles.pillText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function LoadingView({ label = 'Loading Umbil…' }: { label?: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={colors.teal} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  button_primary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  button_secondary: {
    backgroundColor: colors.white,
    borderColor: colors.teal,
  },
  button_danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonLabel_primary: { color: colors.white },
  buttonLabel_secondary: { color: colors.tealDark },
  buttonLabel_danger: { color: colors.white },
  buttonLabel_ghost: { color: colors.tealDark },
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
  },
  inputMultiline: {
    minHeight: 112,
    paddingTop: spacing.md,
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
  },
});
