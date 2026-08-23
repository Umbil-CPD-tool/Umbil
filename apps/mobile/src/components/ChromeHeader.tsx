import { router } from "expo-router";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { getMyProfile } from "@/lib/profile";
import { useMenu } from "@/providers/MenuProvider";

/** Shared shell header: live streak + logo → home (new chat). */
export const ChromeHeader = () => {
  const { currentStreak, hasLoggedToday } = useCpdStreaks();
  const { requestNewChat } = useMenu();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    void getMyProfile().then((profile) => {
      if (profile) {
        setIsPro(!!profile.is_pro || profile.subscription_status === "active");
      }
    });
  }, []);

  return (
    <AppHeader
      streak={currentStreak}
      hasLoggedToday={hasLoggedToday}
      isPro={isPro}
      onLogoPress={() => {
        requestNewChat();
        router.push("/(app)/(drawer)/chat");
      }}
      onStreakPress={() => router.push("/(app)/(drawer)/account")}
    />
  );
};
