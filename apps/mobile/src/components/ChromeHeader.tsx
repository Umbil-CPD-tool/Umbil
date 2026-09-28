import { router } from "expo-router";

import { AppHeader } from "@/components/AppHeader";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { useMenu } from "@/providers/MenuProvider";

/** Shared shell header: invite + centered logo + streak. */
export const ChromeHeader = () => {
  const { currentStreak, hasLoggedThisWeek } = useCpdStreaks();
  const { requestNewChat } = useMenu();

  return (
    <AppHeader
      streak={currentStreak}
      hasLoggedThisWeek={hasLoggedThisWeek}
      onLogoPress={requestNewChat}
      onStreakPress={() => router.push("/(app)/(drawer)/account")}
    />
  );
};
