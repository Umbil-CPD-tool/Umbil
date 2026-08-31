import { Stack, router } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  deleteAccount,
  isNoBillingProfileError,
  NO_STRIPE_BILLING_MESSAGE,
  openBillingPortal,
  openExternalUrl,
} from "@/lib/api";
import { getPublicEnv } from "@/lib/env";
import { shareInvite } from "@/lib/invite";
import { getMyProfile, upsertMyProfile } from "@/lib/profile";
import { appStorage } from "@/lib/appStorage";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";
import { useCenteredContentStyle } from "@/components/ScreenSafe";

const PHI_ACK_KEY = "no_phi_ack";

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const { isDark, setDarkMode, colors } = useTheme();
  const headerHeight = useHeaderHeight();
  const contentStyle = useCenteredContentStyle();
  const [isPro, setIsPro] = useState(false);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [optUpdates, setOptUpdates] = useState(false);
  const [optNewsletter, setOptNewsletter] = useState(false);
  const [phiAccepted, setPhiAccepted] = useState(false);
  const [savingComms, setSavingComms] = useState(false);
  const [savingPhi, setSavingPhi] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const { apiUrl } = getPublicEnv();
  const origin = apiUrl.replace(/\/$/, "");

  useEffect(() => {
    void (async () => {
      const profile = await getMyProfile();
      if (profile) {
        setIsPro(!!profile.is_pro || profile.subscription_status === "active");
        setHasStripeCustomer(!!profile.stripe_customer_id?.trim());
        setOptUpdates(!!profile.opt_in_updates);
        setOptNewsletter(!!profile.opt_in_newsletter);
      }
      const ack = await appStorage.getItem(PHI_ACK_KEY);
      setPhiAccepted(ack === "yes");
    })();
  }, []);

  const saveCommsPref = async () => {
    setSavingComms(true);
    try {
      await upsertMyProfile({
        opt_in_updates: optUpdates,
        opt_in_newsletter: optNewsletter,
      });
      Alert.alert("Saved", "Communication preferences saved to your profile.");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save preferences."
      );
    } finally {
      setSavingComms(false);
    }
  };

  const savePhiAck = async () => {
    setSavingPhi(true);
    try {
      await appStorage.setItem(PHI_ACK_KEY, phiAccepted ? "yes" : "no");
      Alert.alert("Saved", "Safety setting saved.");
    } finally {
      setSavingPhi(false);
    }
  };

  const handleInvite = async () => {
    const shared = await shareInvite();
    if (!shared) {
      Alert.alert("Share failed", "Could not open the share sheet.");
    }
  };

  const handleManageSubscription = async () => {
    if (!hasStripeCustomer) {
      Alert.alert("Subscription", NO_STRIPE_BILLING_MESSAGE);
      return;
    }
    setPortalLoading(true);
    try {
      const { url } = await openBillingPortal();
      if (!url) throw new Error("Could not open billing portal.");
      await openExternalUrl(url);
    } catch (err) {
      if (isNoBillingProfileError(err)) {
        Alert.alert("Subscription", NO_STRIPE_BILLING_MESSAGE);
      } else {
        Alert.alert(
          "Billing error",
          err instanceof Error ? err.message : "Something went wrong."
        );
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const onDelete = async () => {
    if (deleteConfirm !== "DELETE") {
      Alert.alert(
        "Confirm deletion",
        "To confirm, please type DELETE below."
      );
      return;
    }
    Alert.alert(
      "Delete account",
      "Are you sure you want to permanently delete your Umbil account? This action cannot be undone and all your CPD data will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Permanently Delete Account",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteAccount();
                await signOut();
                router.replace("/(auth)/sign-in");
              } catch (err) {
                Alert.alert(
                  "Error",
                  err instanceof Error ? err.message : "Delete failed"
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Settings",
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: fonts.semiBold,
            color: colors.text,
          },
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={[styles.section, { color: colors.textMuted }]}>
          Appearance
        </Text>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>
            Dark mode
          </Text>
          <Switch
            value={isDark}
            onValueChange={setDarkMode}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          Subscription & Billing
        </Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>
          {isPro
            ? hasStripeCustomer
              ? "You are currently on Umbil Pro. Manage your payment methods, download invoices, or cancel your plan here."
              : `You are currently on Umbil Pro. ${NO_STRIPE_BILLING_MESSAGE}`
            : "You are currently on the Free plan. Upgrade to unlock Deep Dive Q&A and unlimited features."}
        </Text>
        {isPro ? (
          hasStripeCustomer ? (
            <Pressable
              style={[
                styles.outlineBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                portalLoading && { opacity: 0.6 },
              ]}
              onPress={() => void handleManageSubscription()}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                  Manage Subscription
                </Text>
              )}
            </Pressable>
          ) : null
        ) : (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(app)/pro")}
          >
            <Text style={styles.primaryBtnText}>Upgrade to Pro</Text>
          </Pressable>
        )}

        <Text style={[styles.section, { color: colors.textMuted }]}>
          Share Umbil
        </Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>
          Help us grow by inviting your colleagues to try Umbil.
        </Text>
        <Pressable
          style={[
            styles.outlineBtn,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          onPress={() => void handleInvite()}
        >
          <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
            Invite a colleague
          </Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          Communication Preferences
        </Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>
          Please select if you would like to opt-in to our updates and weekly
          newsletters:
        </Text>
        <View style={styles.switchRow}>
          <Text style={[styles.commsLabel, { color: colors.text }]}>
            Product updates
          </Text>
          <Switch
            value={optUpdates}
            onValueChange={setOptUpdates}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Text style={[styles.commsHint, { color: colors.textMuted }]}>
          General updates about Umbil and new upcoming features.
        </Text>
        <View style={styles.switchRow}>
          <Text style={[styles.commsLabel, { color: colors.text }]}>
            Newsletter
          </Text>
          <Switch
            value={optNewsletter}
            onValueChange={setOptNewsletter}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Text style={[styles.commsHint, { color: colors.textMuted }]}>
          Subscribe to our weekly newsletter on tips & best practices.
        </Text>
        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, alignSelf: "flex-start" },
            savingComms && { opacity: 0.6 },
          ]}
          onPress={() => void saveCommsPref()}
          disabled={savingComms}
        >
          {savingComms ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Preferences</Text>
          )}
        </Pressable>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          GDPR / Data Safety Checklist
        </Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>
          Your safety and data privacy is our priority. Please review and
          confirm your understanding of our data practices:
        </Text>
        <View style={styles.switchRow}>
          <Text style={[styles.phiLabel, { color: colors.text }]}>
            I understand I must not enter patient-identifiable information (PHI)
            into Umbil.
          </Text>
          <Switch
            value={phiAccepted}
            onValueChange={setPhiAccepted}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <Text style={[styles.phiFixed, { color: colors.textMuted }]}>
          I know that my conversations are logged as CPD and can be exported as
          a CSV from the Learning Log (Right to Data Portability).
        </Text>
        <Text style={[styles.phiFixed, { color: colors.textMuted }]}>
          I understand that deleting my account below performs a full remote
          erasure of my data (Right to Erasure).
        </Text>
        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, alignSelf: "flex-start" },
            savingPhi && { opacity: 0.6 },
          ]}
          onPress={() => void savePhiAck()}
          disabled={savingPhi}
        >
          {savingPhi ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save PHI Acknowledgment</Text>
          )}
        </Pressable>

        <Text style={[styles.section, { color: colors.textMuted }]}>
          Support
        </Text>
        <Pressable onPress={() => router.push("/(app)/contact")}>
          <Text style={[styles.link, { color: colors.primary }]}>
            Contact Us
          </Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.textMuted }]}>Legal</Text>
        <Pressable onPress={() => void Linking.openURL(`${origin}/privacy`)}>
          <Text style={[styles.link, { color: colors.primary }]}>
            Privacy Policy
          </Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(`${origin}/terms`)}>
          <Text style={[styles.link, { color: colors.primary }]}>
            Terms of Use
          </Text>
        </Pressable>

        <Text style={[styles.section, { color: colors.danger }]}>
          Danger Zone: Account Deletion
        </Text>
        <Text style={[styles.copy, { color: colors.textMuted }]}>
          Permanently delete your Umbil user profile and all associated remote
          CPD/PDP data. Type DELETE to confirm.
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
            },
          ]}
          value={deleteConfirm}
          onChangeText={setDeleteConfirm}
          autoCapitalize="characters"
          placeholder="DELETE"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          style={[
            styles.dangerBtn,
            { backgroundColor: colors.dangerMuted },
            deleting && { opacity: 0.6 },
          ]}
          onPress={() => void onDelete()}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={[styles.dangerBtnText, { color: colors.danger }]}>
              Permanently Delete Account
            </Text>
          )}
        </Pressable>
        <Text style={[styles.note, { color: colors.textMuted }]}>
          Note: This action is irreversible.
        </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: 13,
    textTransform: "uppercase",
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  switchLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    flex: 1,
  },
  commsLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    flex: 1,
  },
  commsHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    marginTop: -4,
  },
  phiLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  phiFixed: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  primaryBtn: {
    borderRadius: radii.sm,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryBtnText: { color: "#fff", fontFamily: fonts.bold },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  outlineBtnText: { fontFamily: fonts.bold },
  link: {
    fontFamily: fonts.bold,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    fontFamily: fonts.regular,
    marginBottom: 12,
    // Suppress RN Web's default black focus outline. No-op on native.
    outlineWidth: 0,
  },
  dangerBtn: {
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerBtnText: { fontFamily: fonts.bold },
  note: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
