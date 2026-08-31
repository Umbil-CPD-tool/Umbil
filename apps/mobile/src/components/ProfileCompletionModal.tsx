import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appStorage } from "@/lib/appStorage";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

export const PROFILE_PROMPT_NEVER_KEY = "umbil_profile_prompt_never";
export const PROFILE_PROMPT_SNOOZE_KEY = "umbil_profile_prompt_snooze_until";
export const PROFILE_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const BRAND_TEAL = "#1fb8cd";

type ProfileShape = {
  full_name: string | null;
  grade: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  missingName: boolean;
  missingGrade: boolean;
};

export const isProfileIncomplete = (
  profile: ProfileShape | null
): boolean => {
  if (!profile) return false;
  return !profile.full_name?.trim() || !profile.grade?.trim();
};

export const shouldShowProfilePrompt = async (): Promise<boolean> => {
  try {
    const never = await appStorage.getItem(PROFILE_PROMPT_NEVER_KEY);
    if (never === "true") return false;
    const snoozeUntil = await appStorage.getItem(PROFILE_PROMPT_SNOOZE_KEY);
    if (snoozeUntil && Date.now() < Number(snoozeUntil)) return false;
    return true;
  } catch {
    return true;
  }
};

export const ProfileCompletionModal = ({
  isOpen,
  onClose,
  missingName,
  missingGrade,
}: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const missingBoth = missingName && missingGrade;
  const title = missingBoth
    ? "Add your name & grade"
    : missingName
      ? "Add your name"
      : "Add your position / grade";

  const handleComplete = () => {
    onClose();
    router.push("/(app)/(drawer)/account");
  };

  const handleRemindLater = () => {
    void appStorage.setItem(
      PROFILE_PROMPT_SNOOZE_KEY,
      String(Date.now() + PROFILE_PROMPT_SNOOZE_MS)
    );
    onClose();
  };

  const handleNever = () => {
    void (async () => {
      await appStorage.setItem(PROFILE_PROMPT_NEVER_KEY, "true");
      await appStorage.deleteItem(PROFILE_PROMPT_SNOOZE_KEY);
    })();
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleRemindLater}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, spacing.lg),
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Pressable
            onPress={handleRemindLater}
            style={[styles.closeBtn, { backgroundColor: colors.hoverBg }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Remind me in a week"
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={32} color={BRAND_TEAL} />
          </View>

          <Text
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Takes under a minute — and helps Umbil deliver work that already
            looks like it came from you.
          </Text>

          <View
            style={[
              styles.bullets,
              {
                backgroundColor: colors.background,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.bulletRow}>
              <Ionicons name="create-outline" size={20} color={BRAND_TEAL} />
              <Text style={[styles.bulletText, { color: colors.text }]}>
                Auto-sign referral letters and discharge summaries with your name
                and grade
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="medkit-outline" size={20} color={BRAND_TEAL} />
              <Text style={[styles.bulletText, { color: colors.text }]}>
                Get answers pitched closer to your level of practice
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={BRAND_TEAL}
              />
              <Text style={[styles.bulletText, { color: colors.text }]}>
                Show up correctly across Umbil — no placeholder sign-offs
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleComplete}
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Update profile"
          >
            <Text style={styles.primaryBtnText}>Update profile</Text>
          </Pressable>
          <Pressable
            onPress={handleRemindLater}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
              Remind me in a week
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNever}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text style={[styles.neverBtnText, { color: colors.textMuted }]}>
              Don't remind me again
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    position: "relative",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(31, 184, 205, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  bullets: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 14,
    marginBottom: spacing.lg,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: BRAND_TEAL,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  secondaryBtnText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 12,
  },
  neverBtnText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
    opacity: 0.85,
  },
});
