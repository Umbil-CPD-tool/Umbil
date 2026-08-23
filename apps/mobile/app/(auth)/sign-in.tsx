import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { Button, Field, Message } from "@/components/ui";
import { getPublicEnv } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import { colors, radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type Mode = "signIn" | "signUp" | "forgotPassword" | "verify";

export default function SignInScreen() {
  const {
    signIn,
    signUp,
    verifyOtp,
    resendSignupCode,
    requestPasswordOtp,
  } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>(
    params.mode === "signUp" ? "signUp" : "signIn"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyType, setVerifyType] = useState<"signup" | "email">("signup");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"info" | "error" | "success">("info");

  const { apiUrl } = getPublicEnv();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const show = (text: string, nextTone: "info" | "error" | "success" = "info") => {
    setMessage(text);
    setTone(nextTone);
  };

  const openWeb = (path: string) => {
    const root = apiUrl.replace(/\/$/, "") || "https://umbil.ai";
    void Linking.openURL(`${root}${path}`);
  };

  const title =
    mode === "verify"
      ? "Verify Email"
      : mode === "signUp"
        ? "Create Account"
        : mode === "forgotPassword"
          ? "Reset Password"
          : "Sign In to Umbil";

  const onSubmit = async () => {
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signIn") {
        if (!email.trim() || !password) {
          show("Please enter both email and password.", "error");
          return;
        }
        const { error } = await signIn(email, password);
        if (error) show(`⚠️ ${error}`, "error");
        return;
      }

      if (mode === "signUp") {
        if (!fullName.trim()) {
          show("Please enter your full name.", "error");
          return;
        }
        if (!email.trim() || !password) {
          show("Please enter both email and password.", "error");
          return;
        }
        if (!agreedToTerms) {
          show("You must agree to the Terms and Conditions to create an account.", "error");
          return;
        }
        if (cooldown > 0) {
          show(`Please wait ${cooldown}s before trying again.`, "error");
          return;
        }
        const { error, needsVerification } = await signUp(
          email,
          password,
          fullName,
          grade
        );
        if (error) {
          if (error.toLowerCase().includes("already registered")) {
            show("⚠️ This email is already registered. Please Sign In.", "error");
            setMode("signIn");
          } else {
            show(`⚠️ ${error}`, "error");
          }
          return;
        }
        if (needsVerification) {
          setVerifyType("signup");
          setMode("verify");
          setCooldown(60);
          show(
            "✅ Account created! Please check your email for the 6-digit code.",
            "success"
          );
        }
        return;
      }

      if (mode === "forgotPassword") {
        if (!email.trim()) {
          show("Please enter your email address above.", "error");
          return;
        }
        if (cooldown > 0) {
          show(`Please wait ${cooldown}s before sending another code.`, "error");
          return;
        }
        const { error } = await requestPasswordOtp(email);
        if (error) {
          show(`⚠️ ${error}`, "error");
          return;
        }
        setVerifyType("email");
        setMode("verify");
        setCooldown(60);
        show("✅ Code sent! Check your email and enter the code below.", "success");
        return;
      }

      if (mode === "verify") {
        if (!otp.trim()) {
          show("Please enter the 6-digit code.", "error");
          return;
        }
        const { error } = await verifyOtp(email, otp, verifyType);
        if (error) show(`⚠️ ${error}`, "error");
        else show("✅ Verified! Signing you in...", "success");
      }
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } =
        verifyType === "signup"
          ? await resendSignupCode(email)
          : await requestPasswordOtp(email);
      if (error) {
        show(`⚠️ ${error}`, "error");
        return;
      }
      setCooldown(60);
      show("✅ Code resent! Please check your email.", "success");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // Clears notches/camera cutouts while keeping the same visual gap
          // below the safe area that the web version gets from the browser chrome.
          { paddingTop: insets.top + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {router.canGoBack() ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}

        <BrandMark showImage size="auth" />

        <Text style={styles.heading}>{title}</Text>

        {mode === "verify" ? (
          <Text style={styles.helper}>
            We sent a code to <Text style={styles.helperStrong}>{email}</Text>.
            {"\n"}
            <Text style={styles.helperTeal}>
              (Please check your Junk folder if it doesn&apos;t appear)
            </Text>
          </Text>
        ) : mode !== "forgotPassword" ? (
          <Text style={styles.helper}>Continue with your email and password</Text>
        ) : (
          <Text style={styles.helper}>Enter your email to receive a reset code</Text>
        )}

        {message ? <Message text={message} tone={tone} /> : null}

        <View style={styles.card}>
          {mode === "verify" ? (
            <>
              <Field
                label="Verification Code"
                placeholder="123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                style={styles.otpInput}
              />
              <View style={styles.verifyActions}>
                <Pressable
                  onPress={() => void onResend()}
                  disabled={loading || cooldown > 0}
                >
                  <Text style={styles.link}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </Text>
                </Pressable>
                <View style={styles.verifyButtons}>
                  <Button
                    label="Back"
                    variant="secondary"
                    align="end"
                    onPress={() => {
                      setMode(verifyType === "signup" ? "signUp" : "forgotPassword");
                      setMessage(null);
                    }}
                    disabled={loading}
                  />
                  <Button
                    label={loading ? "Verifying..." : "Verify Code"}
                    align="end"
                    onPress={() => void onSubmit()}
                    loading={loading}
                    disabled={otp.length < 6}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              {mode === "signUp" ? (
                <Field
                  label="Full Name"
                  placeholder="e.g., John Doe"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  textContentType="name"
                />
              ) : null}

              <Field
                label="Email Address"
                placeholder="e.g., your.email@nhs.net"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />

              {mode === "signUp" ? (
                <Field
                  label="Position / Grade (Optional)"
                  placeholder="e.g., 5th Year Medical Student, GP, FY1"
                  value={grade}
                  onChangeText={setGrade}
                  autoCapitalize="sentences"
                />
              ) : null}

              {mode !== "forgotPassword" ? (
                <Field
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType={mode === "signUp" ? "newPassword" : "password"}
                />
              ) : null}

              {mode === "signUp" ? (
                <Pressable
                  style={styles.termsRow}
                  onPress={() => setAgreedToTerms((v) => !v)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      agreedToTerms && styles.checkboxChecked,
                    ]}
                  >
                    {agreedToTerms ? (
                      <Text style={styles.checkboxMark}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{" "}
                    <Text style={styles.link} onPress={() => openWeb("/terms")}>
                      Terms & Conditions
                    </Text>{" "}
                    and{" "}
                    <Text style={styles.link} onPress={() => openWeb("/privacy")}>
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </Pressable>
              ) : null}

              <Button
                label={
                  mode === "forgotPassword"
                    ? cooldown > 0
                      ? `Wait ${cooldown}s`
                      : loading
                        ? "Sending..."
                        : "Send Reset Code"
                    : mode === "signUp"
                      ? cooldown > 0
                        ? `Wait ${cooldown}s`
                        : loading
                          ? "Signing Up..."
                          : "Sign Up"
                      : loading
                        ? "Signing In..."
                        : "Sign In"
                }
                align="end"
                onPress={() => void onSubmit()}
                loading={loading}
                disabled={
                  mode === "signUp" &&
                  (!fullName.trim() || !agreedToTerms || cooldown > 0)
                }
              />
            </>
          )}
        </View>

        {mode !== "verify" ? (
          <Text style={styles.footer}>
            {mode === "signIn" ? (
              <>
                New to Umbil?{" "}
                <Text
                  style={styles.link}
                  onPress={() => {
                    setMode("signUp");
                    setMessage(null);
                  }}
                >
                  Create an account
                </Text>
                <Text style={styles.footerDivider}> | </Text>
                <Text
                  style={styles.link}
                  onPress={() => {
                    setMode("forgotPassword");
                    setMessage(null);
                  }}
                >
                  Forgot Password?
                </Text>
              </>
            ) : null}
            {mode === "signUp" ? (
              <>
                Already have an account?{" "}
                <Text
                  style={styles.link}
                  onPress={() => {
                    setMode("signIn");
                    setMessage(null);
                  }}
                >
                  Sign in here
                </Text>
              </>
            ) : null}
            {mode === "forgotPassword" ? (
              <Text
                style={styles.link}
                onPress={() => {
                  setMode("signIn");
                  setMessage(null);
                }}
              >
                ← Back to Sign In
              </Text>
            ) : null}
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  brandRow: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  tagline: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  helper: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  helperStrong: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  helperTeal: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      web: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.05)",
      },
      default: {},
    }),
  },
  otpInput: {
    letterSpacing: 2,
    fontSize: 20,
    textAlign: "center",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    opacity: 0.9,
  },
  footer: {
    marginTop: spacing.lg,
    textAlign: "center",
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  footerDivider: {
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
  verifyActions: {
    gap: spacing.md,
  },
  verifyButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
