import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

export type PickerOption<T> = { value: T; label: string };

type PickerSheetProps<T> = {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  selectedValue?: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/** Bottom sheet picker — use instead of Alert.alert when there are more than 3 options (Android limit). */
export const PickerSheet = <T,>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: PickerSheetProps<T>) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => {
              const active = opt.value === selectedValue;
              return (
                <Pressable
                  key={String(opt.label)}
                  onPress={() => onSelect(opt.value)}
                  style={[
                    styles.row,
                    active && { backgroundColor: colors.hoverBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowLabel,
                      { color: active ? colors.primary : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.cancel} hitSlop={8}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    paddingTop: spacing.sm,
    maxHeight: "70%",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  list: { maxHeight: 360 },
  row: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  rowLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  cancel: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
