import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { LoadingView } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

const icon = (symbol: string, focused: boolean) => (
  <Text style={[styles.icon, focused && styles.iconFocused]}>{symbol}</Text>
);

export default function TabsLayout() {
  const { session, initializing } = useAuth();

  if (initializing) return <LoadingView />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tealDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ask Umbil',
          tabBarIcon: ({ focused }) => icon('✦', focused),
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: 'Learning',
          tabBarIcon: ({ focused }) => icon('▤', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => icon('●', focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    height: 78,
    paddingBottom: 10,
    paddingTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  icon: {
    color: colors.muted,
    fontSize: 20,
  },
  iconFocused: {
    color: colors.tealDark,
  },
});
