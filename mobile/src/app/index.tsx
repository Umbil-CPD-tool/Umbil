import { Redirect } from 'expo-router';
import { LoadingView } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { session, initializing } = useAuth();

  if (initializing) return <LoadingView />;
  return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
}
