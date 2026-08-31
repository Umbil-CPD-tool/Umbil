import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type AppHeaderProps = {
  streak?: number;
  hasLoggedToday?: boolean;
  onStreakPress?: () => void;
  onLogoPress?: () => void;
  showProLink?: boolean;
  isPro?: boolean;
};

export const AppHeader = ({
  streak = 0,
  hasLoggedToday = true,
  onStreakPress,
  onLogoPress,
  showProLink = true,
  isPro = false,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 390;

  return (
    <View
      style={[
        styles.header,
        {
          // A few extra px beyond the raw inset so content (esp. the
          // top-right Pro/streak cluster) clears notches/camera cutouts
          // with breathing room instead of sitting flush against them.
          paddingTop: insets.top > 0 ? insets.top + 6 : 8,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.iconBtn}
        accessibilityLabel="Open sidebar menu"
      >
        <Ionicons name="menu" size={26} color={colors.text} />
      </Pressable>

      <BrandMark onPress={onLogoPress} size="header" compact={compact} />

      <View style={styles.right}>
        {showProLink ? (
          <Pressable
            onPress={() => router.push("/(app)/pro")}
            style={styles.proLink}
            accessibilityLabel={isPro ? "Umbil Pro" : "Upgrade to Umbil Pro"}
          >
            {!isPro ? (
              <Ionicons name="sparkles" size={13} color="#f59e0b" />
            ) : null}
            {compact && !isPro ? null : (
              <Text style={[styles.pro, { color: colors.primary }]}>
                {isPro ? "Pro" : "Upgrade"}
              </Text>
            )}
          </Pressable>
        ) : null}
        <Pressable
          onPress={onStreakPress}
          style={[
            styles.streak,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
            !hasLoggedToday && styles.streakFaded,
          ]}
          accessibilityLabel="Learning streak"
        >
          <Text style={[styles.streakText, { color: colors.text }]}>
            {streak}
          </Text>
          <Text style={styles.streakEmoji}>🔥</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  pro: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  streakFaded: {
    opacity: 0.5,
  },
  streakText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  streakEmoji: {
    fontSize: 13,
  },
});
