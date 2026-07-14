import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Card, Field, uiStyles } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <Text style={styles.logo}>Umbil</Text>
        <Text style={styles.tagline}>Your Medical Lifeline</Text>
      </View>

      <View style={styles.heading}>
        <Text style={uiStyles.title}>Welcome back</Text>
        <Text style={uiStyles.subtitle}>
          Sign in to continue your clinical learning and CPD.
        </Text>
      </View>

      <Card style={styles.form}>
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
          autoComplete="current-password"
          label="Password"
          onChangeText={setPassword}
          onSubmitEditing={() => void signIn()}
          placeholder="Your password"
          secureTextEntry
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Sign in" loading={loading} onPress={() => void signIn()} />

        <Link href="/(auth)/forgot-password" style={styles.link}>
          Forgotten your password?
        </Link>
      </Card>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New to Umbil?</Text>
        <Link href="/(auth)/sign-up" style={styles.linkStrong}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: 2,
  },
  logo: {
    color: colors.teal,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  tagline: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  heading: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  footerText: {
    color: colors.muted,
  },
  linkStrong: {
    color: colors.tealDark,
    fontWeight: '800',
  },
});
