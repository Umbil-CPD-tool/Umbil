import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { shareInvite } from "@/lib/invite";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type AppHeaderProps = {
  streak?: number;
  hasLoggedToday?: boolean;
  onStreakPress?: () => void;
  onLogoPress?: () => void;
};

export const AppHeader = ({
  streak = 0,
  hasLoggedToday = true,
  onStreakPress,
  onLogoPress,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const paddingTop = insets.top > 0 ? insets.top + 6 : 8;

  return (
    <View
      style={[
        styles.safe,
        {
          paddingTop,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.side}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.iconBtn}
            accessibilityLabel="Open sidebar menu"
          >
            <Ionicons name="menu" size={26} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => void shareInvite()}
            style={[
              styles.shareBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.primaryMuted,
              },
            ]}
            accessibilityLabel="Invite a colleague"
          >
            <Ionicons name="share-social-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View pointerEvents="box-none" style={styles.center}>
          <BrandMark onPress={onLogoPress} size="header" compact={compact} />
        </View>

        <View style={[styles.side, styles.sideRight]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  side: {
    zIndex: 2,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    pointerEvents: "box-none",
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  shareBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
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
