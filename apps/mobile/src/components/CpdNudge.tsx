import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type Props = {
  onLog: () => void;
};

export const CpdNudge = ({ onLog }: Props) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.hoverBg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>🧠</Text>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>
            Capture this for your appraisal?
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            You’ve covered a lot of ground! If this answer was useful, logging it
            now takes just seconds and builds your evidence base.
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onLog}
        style={[styles.button, { borderColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Capture learning"
      >
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          Capture learning
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.sm,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    marginBottom: 4,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: "flex-start",
    marginLeft: 36,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
});
