import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChromeHeader } from "@/components/ChromeHeader";
import { useCenteredContentStyle } from "@/components/ScreenSafe";
import { StreakHeatmap } from "@/components/StreakHeatmap";
import { WeeklySummaryCard } from "@/components/WeeklySummaryCard";
import { getMyProfile, upsertMyProfile, type Profile } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

/** My Profile — aligned with web `/profile`. */
export default function AccountScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const contentStyle = useCenteredContentStyle();
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [isNewUser, setIsNewUser] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  // Memory keeps being rewritten by the chat consolidator. Saving an untouched textarea
  // would push a stale value back over it, so track what was loaded.
  const loadedMemoryRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const userProfile = await getMyProfile();
    if (userProfile) {
      setProfile(userProfile);
      loadedMemoryRef.current = userProfile.custom_instructions ?? null;
      setIsNewUser(false);
    } else {
      setProfile({});
      loadedMemoryRef.current = null;
      setIsNewUser(true);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const isPro =
    !!profile?.is_pro || profile?.subscription_status === "active";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const memoryUntouched =
        (profile.custom_instructions ?? null) === loadedMemoryRef.current;
      const { custom_instructions, ...rest } = {
        full_name: profile.full_name,
        grade: profile.grade,
        academic_email: profile.academic_email,
        custom_instructions: profile.custom_instructions,
      };
      await upsertMyProfile(
        memoryUntouched ? rest : { ...rest, custom_instructions }
      );
      setIsNewUser(false);
      const saved = await getMyProfile();
      if (saved) {
        setProfile(saved);
        loadedMemoryRef.current = saved.custom_instructions ?? null;
      }
      setSaveMsg("Profile saved successfully!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setPasswordMsg("⚠️ Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("⚠️ Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg(null);

    const { error: pwError } = await getSupabase().auth.updateUser({
      password: newPassword,
    });

    setPasswordLoading(false);

    if (pwError) {
      setPasswordMsg(`⚠️ Error: ${pwError.message}`);
    } else {
      setPasswordMsg(
        "✅ Success! Your password has been set. You can now use email/password to sign in."
      );
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  } as const;

  const labelStyle = {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  } as const;

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    // Suppress RN Web's default black focus outline. No-op on native.
    outlineWidth: 0,
  } as const;

  const helperMuted = {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  } as const;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ChromeHeader />
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.regular }}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ChromeHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[{ padding: spacing.lg }, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 24,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          {isNewUser ? "Complete Your Profile" : "Edit Profile"}
        </Text>

        <StreakHeatmap />
        <WeeklySummaryCard showActions />

        {/* Account Information */}
        <View style={cardStyle}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 18,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            Account Information
          </Text>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={labelStyle}>Primary Account Email</Text>
            <TextInput
              style={{
                ...inputStyle,
                backgroundColor: colors.hoverBg,
                color: colors.textMuted,
                opacity: 0.8,
              }}
              value={user?.email ?? ""}
              editable={false}
            />
            <Text style={helperMuted}>
              This is your login email, managed securely.
            </Text>
          </View>

          <View>
            <Text style={labelStyle}>University Email (.ac.uk)</Text>
            <TextInput
              style={inputStyle}
              value={profile.academic_email || ""}
              onChangeText={(v) =>
                setProfile({ ...profile, academic_email: v })
              }
              placeholder="e.g. j.doe@ucl.ac.uk"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 13,
                color: colors.primary,
                marginTop: 4,
              }}
            >
              Are you a medical student? Add a valid .ac.uk email here to
              automatically unlock Umbil Pro.
            </Text>
          </View>
        </View>

        {/* Clinical Details */}
        <View style={cardStyle}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 18,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            Your Clinical Details
          </Text>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={labelStyle}>Full Name</Text>
            <TextInput
              style={inputStyle}
              value={profile.full_name || ""}
              onChangeText={(v) => setProfile({ ...profile, full_name: v })}
              placeholder="Dr. Mickey Mouse"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={labelStyle}>Position / Grade</Text>
            <TextInput
              style={inputStyle}
              value={profile.grade || ""}
              onChangeText={(v) => setProfile({ ...profile, grade: v })}
              placeholder="e.g., FY1 Doctor, GP Trainee"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View
            style={{
              marginTop: 4,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={labelStyle}>Memory & Custom Instructions</Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13,
                color: colors.textMuted,
                marginBottom: 8,
                lineHeight: 18,
              }}
            >
              How would you like Umbil to respond? Add context about your role
              or preferences (e.g., "I prefer tabular outputs", "I work in a
              rural GP practice").
            </Text>
            <TextInput
              style={{
                ...inputStyle,
                minHeight: 100,
                textAlignVertical: "top",
              }}
              value={profile.custom_instructions || ""}
              onChangeText={(v) =>
                setProfile({ ...profile, custom_instructions: v })
              }
              placeholder="e.g. Always include a safety-netting section. I prefer simple language."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          {error ? (
            <Text
              style={{
                color: colors.danger,
                fontFamily: fonts.regular,
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          ) : null}
          {saveMsg ? (
            <Text
              style={{
                color: colors.primary,
                fontFamily: fonts.semiBold,
                marginTop: 12,
              }}
            >
              {saveMsg}
            </Text>
          ) : null}

          <Pressable
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.sm,
              paddingVertical: 12,
              alignItems: "center",
              marginTop: 16,
              opacity: saving ? 0.6 : 1,
            }}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: fonts.bold }}>
                Save Profile
              </Text>
            )}
          </Pressable>
        </View>

        {/* Set or Change Password */}
        <View style={cardStyle}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 18,
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Set or Change Password
          </Text>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 14,
              color: colors.textMuted,
              fontStyle: "italic",
              marginBottom: 16,
              lineHeight: 20,
            }}
          >
            If you previously signed in with a Magic Link, please set a password
            below to enable 'Forgot Password' functionality.
          </Text>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={labelStyle}>New Password (Min 6 chars)</Text>
            <TextInput
              style={inputStyle}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!passwordLoading}
            />
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <Text style={labelStyle}>Confirm New Password</Text>
            <TextInput
              style={inputStyle}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!passwordLoading}
              onSubmitEditing={() => void handleResetPassword()}
            />
          </View>

          <Pressable
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.sm,
              paddingVertical: 12,
              alignItems: "center",
              opacity:
                passwordLoading || !newPassword || !confirmPassword ? 0.5 : 1,
            }}
            onPress={() => void handleResetPassword()}
            disabled={passwordLoading || !newPassword || !confirmPassword}
          >
            {passwordLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: fonts.bold }}>
                Update Password
              </Text>
            )}
          </Pressable>

          {passwordMsg ? (
            <Text
              style={{
                marginTop: 12,
                fontFamily: fonts.regular,
                color: passwordMsg.startsWith("⚠️")
                  ? colors.danger
                  : colors.primary,
              }}
            >
              {passwordMsg}
            </Text>
          ) : null}
        </View>

        {/* Mobile shell links (web uses main nav) */}
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.md,
            marginBottom: spacing.sm,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
          onPress={() => router.push("/(app)/settings")}
        >
          <Text style={{ fontFamily: fonts.semiBold, color: colors.text }}>
            Settings & preferences
          </Text>
          <Text style={{ color: colors.textMuted }}>›</Text>
        </Pressable>
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.md,
            marginBottom: spacing.sm,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
          onPress={() => router.push("/(app)/pro")}
        >
          <Text style={{ fontFamily: fonts.semiBold, color: colors.text }}>
            {isPro ? "Manage billing" : "Upgrade to Pro"}
          </Text>
          <Text style={{ color: colors.textMuted }}>›</Text>
        </Pressable>

        <Pressable
          style={{
            marginTop: spacing.lg,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.primary,
            paddingVertical: 14,
            alignItems: "center",
          }}
          onPress={() => void signOut()}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>
            Sign out
          </Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
