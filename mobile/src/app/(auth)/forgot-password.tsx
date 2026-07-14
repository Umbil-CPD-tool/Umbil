import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Card, Field, uiStyles } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
    });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    router.push({
      pathname: '/(auth)/verify',
      params: { email: normalizedEmail, type: 'recovery' },
    });
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={uiStyles.title}>Reset your password</Text>
        <Text style={uiStyles.subtitle}>
          We will email you a code so you can choose a new password.
        </Text>
      </View>
      <Card style={styles.form}>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          onSubmitEditing={() => void sendCode()}
          placeholder="name@example.com"
          value={email}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Email me a code" loading={loading} onPress={() => void sendCode()} />
        <Button label="Back to sign in" onPress={() => router.back()} variant="ghost" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  heading: { gap: spacing.sm },
  form: { gap: spacing.lg },
  error: { color: colors.danger, fontSize: 14 },
});
