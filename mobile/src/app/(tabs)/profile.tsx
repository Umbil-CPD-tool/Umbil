import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Card, Pill, uiStyles } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { deleteUmbilAccount } from '@/lib/api';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, profile, profileLoading, refreshProfile, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const logout = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const requestDeletion = () => {
    Alert.alert(
      'Permanently delete your Umbil account?',
      'Your CPD, chat history, profile and other associated account data will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Delete the account and all associated Umbil data now?',
              [
                { text: 'Keep account', style: 'cancel' },
                {
                  text: 'Delete account',
                  style: 'destructive',
                  onPress: () => void deleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const deleteAccount = async () => {
    const token = session?.access_token;
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }

    setDeleting(true);
    try {
      await deleteUmbilAccount(token);
      await signOut();
      router.replace('/(auth)/sign-in');
      Alert.alert('Account deleted', 'Your Umbil account has been permanently deleted.');
    } catch (caught) {
      Alert.alert(
        'Could not delete account',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <Text style={uiStyles.title}>Profile</Text>
          <Pill
            label={profile?.is_pro ? 'UMBIL PRO' : 'FREE PLAN'}
            tone={profile?.is_pro ? 'success' : 'muted'}
          />
        </View>
        <Text style={uiStyles.subtitle}>
          Your account is shared with the Umbil website.
        </Text>
      </View>

      <Card style={styles.card}>
        <InfoRow label="Name" value={profile?.full_name || 'Not added'} />
        <InfoRow label="Email" value={profile?.email || session?.user.email || 'Not available'} />
        <InfoRow label="Role or grade" value={profile?.grade || 'Not added'} />
        {profile?.academic_email ? (
          <InfoRow label="Academic email" value={profile.academic_email} />
        ) : null}
        <Button
          label="Refresh account status"
          loading={profileLoading}
          onPress={() => void refreshProfile()}
          variant="secondary"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={uiStyles.sectionTitle}>Privacy and support</Text>
        <Button
          label="Privacy Policy"
          onPress={() => void Linking.openURL(`${env.apiBaseUrl}/privacy`)}
          variant="secondary"
        />
        <Button
          label="Terms and Conditions"
          onPress={() => void Linking.openURL(`${env.apiBaseUrl}/terms`)}
          variant="secondary"
        />
        <Button
          label="Contact Umbil"
          onPress={() => void Linking.openURL('mailto:umbil.support@gmail.com')}
          variant="secondary"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={uiStyles.sectionTitle}>Account</Text>
        <Button label="Sign out" onPress={() => void logout()} variant="secondary" />
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.dangerText}>
            Permanently remove your Umbil account and associated data.
          </Text>
          <Button
            label="Delete my account"
            loading={deleting}
            onPress={requestDeletion}
            variant="danger"
          />
        </View>
      </Card>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: { gap: spacing.lg },
  infoRow: { gap: 4 },
  infoLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  dangerZone: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  dangerTitle: { color: colors.danger, fontSize: 17, fontWeight: '800' },
  dangerText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
