import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useDrawerStatus } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resetQuickTour } from "@/components/QuickTourModal";
import { getPublicEnv } from "@/lib/env";
import { getMyProfile, type Profile } from "@/lib/profile";
import { getChatHistory } from "@/lib/store/chat";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { useAuth } from "@/providers/AuthProvider";
import { useMenu } from "@/providers/MenuProvider";
import { colors, radii, spacing } from "@/theme/colors";
import type { ChatConversation } from "@umbil/shared";

const CORE_LINKS = [
  { href: "/(app)/(drawer)/cpd", label: "Learning Log" },
  { href: "/(app)/(drawer)/account", label: "My Profile" },
  { href: "/(app)/(drawer)/portfolio?tab=pdp", label: "My PDP" },
  { href: "/(app)/(drawer)/portfolio?tab=psq", label: "Appraisals" },
] as const;

const SOCIAL = [
  { label: "Instagram", url: "https://www.instagram.com/umbil.ai/" },
  {
    label: "Facebook",
    url: "https://www.facebook.com/people/Umbil-AI/61565964025530/",
  },
  { label: "LinkedIn", url: "https://uk.linkedin.com/company/umbil" },
  { label: "TikTok", url: "https://www.tiktok.com/@umbil_ai" },
];

/** Rendered as the Drawer's `drawerContent` — swipe-from-edge, no Modal needed. */
export const SideMenu = ({ navigation }: DrawerContentComponentProps) => {
  const insets = useSafeAreaInsets();
  const isOpen = useDrawerStatus() === "open";
  const { requestNewChat, onOpenConversation } = useMenu();
  const { user, signOut } = useAuth();
  const { currentStreak, hasLoggedToday } = useCpdStreaks();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<ChatConversation[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const { apiUrl } = getPublicEnv();
  const origin = apiUrl.replace(/\/$/, "");

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      const [p, h] = await Promise.all([getMyProfile(), getChatHistory()]);
      setProfile(p);
      setHistory(h);
    })();
  }, [isOpen]);

  const visibleHistory = historyExpanded ? history : history.slice(0, 5);
  const hiddenCount = Math.max(0, history.length - 5);

  const go = (path: string) => {
    navigation.closeDrawer();
    if (path.includes("?")) {
      const [pathname, qs] = path.split("?");
      const params = Object.fromEntries(new URLSearchParams(qs));
      router.push({ pathname: pathname as never, params });
    } else {
      router.push(path as never);
    }
  };

  return (
    <View
      style={[
        styles.sidebar,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <Pressable onPress={() => navigation.closeDrawer()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Pressable
          style={styles.newChat}
          onPress={() => {
            requestNewChat();
            navigation.closeDrawer();
          }}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.newChatText}>New Chat</Text>
        </Pressable>

        <Pressable
          style={[styles.streakChip, !hasLoggedToday && styles.streakFaded]}
          onPress={() => go("/(app)/(drawer)/account")}
        >
          <Text style={styles.streakChipText}>
            {currentStreak} day streak 🔥
          </Text>
        </Pressable>

        <View style={styles.navGroup}>
          {CORE_LINKS.map((link) => (
            <Pressable
              key={link.label}
              style={styles.navItem}
              onPress={() => go(link.href)}
            >
              <Text style={styles.navText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        {history.length > 0 ? (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>Recent Chats</Text>
            {visibleHistory.map((item) => (
              <Pressable
                key={item.conversation_id}
                style={styles.historyItem}
                onPress={() => {
                  navigation.closeDrawer();
                  onOpenConversation?.(item.conversation_id);
                  router.push("/(app)/(drawer)/chat");
                }}
              >
                <Text style={styles.historyText} numberOfLines={1}>
                  {item.first_question}
                </Text>
              </Pressable>
            ))}
            {history.length > 5 ? (
              <Pressable
                style={styles.historyToggle}
                onPress={() => setHistoryExpanded((v) => !v)}
              >
                <Text style={styles.historyToggleText}>
                  {historyExpanded ? "Show less" : `Show ${hiddenCount} more`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.proLink} onPress={() => go("/(app)/pro")}>
          <Text style={styles.proText}>Umbil Pro ✨</Text>
        </Pressable>

        <View style={styles.socialRow}>
          <Text style={styles.socialLabel}>Follow us</Text>
          <View style={styles.socialIcons}>
            {SOCIAL.map((s) => (
              <Pressable
                key={s.label}
                style={styles.socialIcon}
                onPress={() => void Linking.openURL(s.url)}
              >
                <Ionicons
                  name={
                    s.label === "Instagram"
                      ? "logo-instagram"
                      : s.label === "Facebook"
                        ? "logo-facebook"
                        : s.label === "LinkedIn"
                          ? "logo-linkedin"
                          : "logo-tiktok"
                  }
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footerGrid}>
          {[
            { label: "About", onPress: () => void Linking.openURL(`${origin}/about`) },
            {
              label: "Quick Tour",
              onPress: () => {
                navigation.closeDrawer();
                void resetQuickTour().then(() =>
                  router.push({
                    pathname: "/(app)/(drawer)/chat",
                    params: { tour: "1" },
                  })
                );
              },
            },
            { label: "Settings", onPress: () => go("/(app)/settings") },
            {
              label: "Contact Us",
              onPress: () => go("/(app)/contact"),
            },
          ].map((btn) => (
            <Pressable key={btn.label} style={styles.footerBtn} onPress={btn.onPress}>
              <Text style={styles.footerBtnText}>{btn.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.full_name || user?.email || "Signed in"}
            </Text>
            {profile?.grade ? (
              <Text style={styles.userRole} numberOfLines={1}>
                {profile.grade}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={styles.signOut}
            onPress={async () => {
              navigation.closeDrawer();
              await signOut();
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  closeBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.md },
  newChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  newChatText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  streakChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
  },
  streakFaded: { opacity: 0.55 },
  streakChipText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  navGroup: { gap: 2, marginBottom: spacing.md },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
  },
  navText: { fontSize: 16, fontWeight: "500", color: colors.text },
  historySection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    paddingLeft: 12,
  },
  historyItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  historyText: { fontSize: 14, color: colors.text },
  historyToggle: { paddingVertical: 10, paddingHorizontal: 12 },
  historyToggleText: { fontSize: 13, color: colors.textMuted },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 12,
  },
  proLink: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  proText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  socialLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  socialIcons: { flexDirection: "row", gap: 8 },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.hoverBg,
    alignItems: "center",
    justifyContent: "center",
  },
  footerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  footerBtn: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  footerBtnText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 8,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  userName: { fontWeight: "600", fontSize: 15, color: colors.text },
  userRole: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  signOut: {
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  signOutText: { color: "#ef4444", fontWeight: "600", fontSize: 13 },
});
