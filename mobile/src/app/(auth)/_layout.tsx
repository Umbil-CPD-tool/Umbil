import { Redirect, Stack, useSegments } from 'expo-router';
import { LoadingView } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function AuthLayout() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const isResetPasswordRoute = (segments as readonly string[]).includes(
  'reset-password',
);

  if (initializing) return <LoadingView />;
  if (session && !isResetPasswordRoute) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
