import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/providers/AuthProvider";
import { MenuProvider } from "@/providers/MenuProvider";
import { colors } from "@/theme/colors";

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  // Wait for the persisted Supabase session to finish restoring before
  // mounting any screens. Rendering the tabs while `isLoading` is true
  // previously let widgets like WeeklySummaryCard fire their first fetch
  // with no session yet, so the API call had no Authorization header and
  // silently failed with "Couldn't load your weekly summary".
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <MenuProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(drawer)" />
        <Stack.Screen
          name="tools"
          options={{ headerShown: true, presentation: "modal" }}
        />
        <Stack.Screen name="cpd/capture" options={{ headerShown: true }} />
        <Stack.Screen name="cpd/analytics" options={{ headerShown: true }} />
        <Stack.Screen name="cpd/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="psq/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="msf/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="settings" options={{ headerShown: true }} />
        <Stack.Screen name="contact" options={{ headerShown: true }} />
        <Stack.Screen name="pro" options={{ headerShown: true }} />
      </Stack>
    </MenuProvider>
  );
}
