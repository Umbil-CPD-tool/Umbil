import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Card, Field, uiStyles } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Complete your name, email address and password.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password containing at least 8 characters.');
      return;
    }
    if (!agreed) {
      setError('You must agree to the Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          grade: grade.trim() || null,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace('/(tabs)');
      return;
    }

    router.push({
      pathname: '/(auth)/verify',
      params: { email: normalizedEmail, type: 'signup' },
    });
  };

  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={uiStyles.title}>Create your account</Text>
        <Text style={uiStyles.subtitle}>
          Use the same account across the Umbil website and mobile app.
        </Text>
      </View>

      <Card style={styles.form}>
        <Field
          autoCapitalize="words"
          label="Full name"
          onChangeText={setFullName}
          placeholder="Your full name"
          value={fullName}
        />
        <Field
          label="Role or grade"
          onChangeText={setGrade}
          placeholder="For example, GP trainee or medical student"
          value={grade}
        />
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="name@example.com"
          value={email}
        />
        <Field
          autoCapitalize="none"
          autoComplete="new-password"
          helper="Use at least 8 characters."
          label="Password"
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
          value={password}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => setAgreed((value) => !value)}
          style={styles.termsRow}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.termsText}>
            I agree to Umbil&apos;s{' '}
            <Text
              onPress={() => void Linking.openURL(`${env.apiBaseUrl}/terms`)}
              style={styles.inlineLink}
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              onPress={() => void Linking.openURL(`${env.apiBaseUrl}/privacy`)}
              style={styles.inlineLink}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Create account" loading={loading} onPress={() => void signUp()} />
      </Card>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already registered?</Text>
        <Link href="/(auth)/sign-in" style={styles.linkStrong}>
          Sign in
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  form: { gap: spacing.lg },
  termsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  checkmark: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  termsText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  inlineLink: {
    color: colors.tealDark,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  footerText: { color: colors.muted },
  linkStrong: { color: colors.tealDark, fontWeight: '800' },
});
