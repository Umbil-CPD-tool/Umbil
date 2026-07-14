import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Screen } from '@/components/screen';
import { Button, Card, Field, uiStyles } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const email = params.email ?? '';
  const verificationType = params.type === 'recovery' ? 'recovery' : 'signup';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    setError(null);
    const type: EmailOtpType = verificationType === 'signup' ? 'signup' : 'email';
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type,
    });
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.replace(
      verificationType === 'recovery'
        ? '/(auth)/reset-password'
        : '/(tabs)',
    );
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setMessage(null);

    const result =
      verificationType === 'signup'
        ? await supabase.auth.resend({ type: 'signup', email })
        : await supabase.auth.signInWithOtp({ email });

    setResending(false);
    if (result.error) setError(result.error.message);
    else setMessage('A new code has been sent.');
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={uiStyles.title}>Check your email</Text>
        <Text style={uiStyles.subtitle}>
          Enter the 6-digit code sent to {email || 'your email address'}.
        </Text>
      </View>

      <Card style={styles.form}>
        <Field
          autoFocus
          keyboardType="number-pad"
          label="Verification code"
          maxLength={6}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          onSubmitEditing={() => void verify()}
          placeholder="000000"
          value={code}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Button label="Verify code" loading={loading} onPress={() => void verify()} />
        <Button
          label="Send another code"
          loading={resending}
          onPress={() => void resend()}
          variant="ghost"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  heading: { gap: spacing.sm },
  form: { gap: spacing.lg },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
});
