import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Card, Field, uiStyles } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePassword = async () => {
    if (password.length < 8) {
      setError('Use a password containing at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={uiStyles.title}>Choose a new password</Text>
        <Text style={uiStyles.subtitle}>
          Your new password will work on both the website and app.
        </Text>
      </View>
      <Card style={styles.form}>
        <Field
          autoCapitalize="none"
          label="New password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
        <Field
          autoCapitalize="none"
          label="Confirm new password"
          onChangeText={setConfirmPassword}
          secureTextEntry
          value={confirmPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Save new password"
          loading={loading}
          onPress={() => void updatePassword()}
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
});
