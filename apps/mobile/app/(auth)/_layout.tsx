import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme/colors";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  if (!isLoading && session) {
    return <Redirect href="/(app)/(drawer)/chat" />;
  }

  return (
    <Stack
      initialRouteName="welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
