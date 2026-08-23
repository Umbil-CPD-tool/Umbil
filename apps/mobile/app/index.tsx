import { Redirect } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

/** Entry redirect — auth gate lives in root layout groups. */
export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (session) {
    return <Redirect href="/(app)/(drawer)/chat" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
