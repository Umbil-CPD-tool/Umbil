import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getPublicEnv } from "@/lib/env";
import { useTheme } from "@/providers/ThemeProvider";
import type { ColorPalette } from "@/theme/colors";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";
import { useCenteredContentStyle } from "@/components/ScreenSafe";

const SUPPORT_EMAIL = "umbil.support@gmail.com";
const FEEDBACK_FORM =
  "https://docs.google.com/forms/d/1hDMhLdFbvVte_WHDgz3GaDXm9qQq6ElLuGfGavy98nw/viewform";

const SOCIAL = [
  {
    label: "Instagram",
    icon: "logo-instagram" as const,
    url: "https://www.instagram.com/umbil.ai/",
  },
  {
    label: "Facebook",
    icon: "logo-facebook" as const,
    url: "https://www.facebook.com/people/Umbil-AI/61565964025530/",
  },
  {
    label: "LinkedIn",
    icon: "logo-linkedin" as const,
    url: "https://uk.linkedin.com/company/umbil",
  },
  {
    label: "TikTok",
    icon: "logo-tiktok" as const,
    url: "https://www.tiktok.com/@umbil_ai",
  },
];

export default function ContactScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const contentStyle = useCenteredContentStyle();
  const [hasClicked, setHasClicked] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(0);
    };
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 0],
  });

  const openFaq = () => {
    const { apiUrl } = getPublicEnv();
    const origin = apiUrl.replace(/\/$/, "");
    void Linking.openURL(`${origin}/about`);
  };

  const copyEmail = async () => {
    await Clipboard.setStringAsync(SUPPORT_EMAIL);
    Alert.alert("Copied", "Email copied to clipboard!");
  };

  const openFeedbackForm = () => {
    setHasClicked(true);
    void Linking.openURL(FEEDBACK_FORM);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Contact Us",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.text },
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, contentStyle]}
      >
        <Text style={styles.title}>Get in Touch</Text>
        <Text style={styles.lead}>
          Whether you're experiencing an issue, have a question, or just want
          to chat with the team, we're here to help.
        </Text>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Email Support</Text>
          <Text style={styles.cardCopy}>
            Reach out to our core team directly for account issues, billing
            queries, or general support. We aim to reply within 24 hours.
          </Text>

          <View style={styles.emailRow}>
            <Pressable
              style={styles.emailBtn}
              onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            >
              <Ionicons name="mail-outline" size={18} color={colors.text} />
              <Text style={styles.emailBtnText} numberOfLines={1}>
                {SUPPORT_EMAIL}
              </Text>
            </Pressable>
            <Pressable style={styles.copyBtn} onPress={() => void copyEmail()}>
              <Ionicons name="copy-outline" size={18} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.faqLine}>
            Looking for quick answers?{" "}
            <Text style={styles.faqLink} onPress={openFaq}>
              Visit our FAQ
            </Text>
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="globe-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Our Socials</Text>
          <Text style={styles.cardCopy}>
            Follow our journey, stay updated on new clinical tools, and join
            the growing Umbil community online.
          </Text>

          <View style={styles.socialGrid}>
            {SOCIAL.map((s) => (
              <Pressable
                key={s.label}
                style={styles.socialBtn}
                onPress={() => void Linking.openURL(s.url)}
              >
                <Ionicons name={s.icon} size={18} color={colors.text} />
                <Text style={styles.socialBtnText} numberOfLines={1}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDotWrap}>
            <Animated.View
              style={[
                styles.statusPing,
                { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
              ]}
            />
            <View style={styles.statusDot} />
          </View>
          <Text style={styles.statusText}>All systems operational</Text>
        </View>

        <View style={styles.feedbackCard}>
          {!hasClicked ? (
            <>
              <Text style={styles.feedbackTitle}>
                Feature Ideas & Bug Reports
              </Text>
              <Text style={styles.feedbackCopy}>
                Have a suggestion to improve Umbil or found a bug? We thrive
                on feedback from clinicians like you. Use our dedicated form
                to log it securely with our product team.
              </Text>
              <Pressable style={styles.feedbackBtn} onPress={openFeedbackForm}>
                <Ionicons name="open-outline" size={20} color="#fff" />
                <Text style={styles.feedbackBtnText}>Open Feedback Form</Text>
              </Pressable>
              <Text style={styles.feedbackHint}>
                We read every submission to shape our next updates.
              </Text>
            </>
          ) : (
            <View style={styles.thankYouWrap}>
              <View style={styles.thankYouIconCircle}>
                <Ionicons
                  name="chatbubble-outline"
                  size={36}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.thankYouTitle}>Thank You!</Text>
              <Text style={styles.feedbackCopy}>
                The feedback form has opened securely in a new tab. We deeply
                appreciate your input in making Umbil better.
              </Text>
              <Pressable
                style={styles.resetBtn}
                onPress={() => setHasClicked(false)}
              >
                <Text style={styles.resetBtnText}>
                  Submit another response
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.lg },
    title: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: colors.text,
      marginBottom: 8,
    },
    lead: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      alignItems: "center",
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    cardCopy: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    emailRow: {
      flexDirection: "row",
      gap: spacing.sm,
      width: "100%",
    },
    emailBtn: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.hoverBg,
      borderRadius: radii.sm,
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    emailBtnText: {
      flexShrink: 1,
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.text,
    },
    copyBtn: {
      width: 48,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.hoverBg,
      borderRadius: radii.sm,
    },
    faqLine: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.md,
    },
    faqLink: {
      fontFamily: fonts.bold,
      color: colors.primary,
      textDecorationLine: "underline",
    },
    socialGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: spacing.sm,
      width: "100%",
    },
    socialBtn: {
      width: "48%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.hoverBg,
      borderRadius: radii.sm,
      paddingVertical: 12,
    },
    socialBtnText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.text,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: spacing.lg,
    },
    statusDotWrap: {
      width: 10,
      height: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    statusPing: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
    },
    statusText: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.success,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    feedbackCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      alignItems: "center",
    },
    feedbackTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    feedbackCopy: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    feedbackBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 16,
      paddingHorizontal: 32,
      width: "100%",
    },
    feedbackBtnText: {
      color: "#fff",
      fontFamily: fonts.bold,
      fontSize: 16,
    },
    feedbackHint: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.md,
    },
    thankYouWrap: { alignItems: "center" },
    thankYouIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    thankYouTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: colors.primary,
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    resetBtn: {
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radii.sm,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    resetBtnText: {
      color: colors.primary,
      fontFamily: fonts.bold,
      fontSize: 14,
    },
  });
