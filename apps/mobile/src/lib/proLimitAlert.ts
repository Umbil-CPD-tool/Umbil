import { STUDENT_PRO_OFFER } from "@umbil/shared";
import { router } from "expo-router";
import { Alert } from "react-native";

import { trackFunnelEvent } from "./api";

export const showLimitReached = (kind: "questions" | "tools" | "learning") => {
  const lead =
    kind === "questions"
      ? "You've used this month's 10 free questions."
      : kind === "tools"
        ? "You've used this month's free tool."
        : "You've used this month's free learning log. Saved entries stay available.";
  Alert.alert(
    "Unlock Umbil Pro",
    `${lead}\n\n7 days free, then £14.99/month. Cancel anytime. ${STUDENT_PRO_OFFER}`,
    [
      {
        text: "Not now",
        style: "cancel",
        onPress: () => {
          void trackFunnelEvent({ event: "upgrade_dismissed", source: "upgrade_alert", channel: "app" });
        },
      },
      {
        text: "Start 7-day trial",
        onPress: () => {
          void trackFunnelEvent({ event: "upgrade_clicked", source: "upgrade_alert", channel: "app" });
          router.push("/(app)/pro");
        },
      },
    ]
  );
};

export const showProLimitAlert = (detail: string) => {
  Alert.alert("Unlock Umbil Pro", `${detail}\n\n7 days free, then £14.99/month. Cancel anytime. ${STUDENT_PRO_OFFER}`, [
    {
      text: "Not now",
      style: "cancel",
      onPress: () => {
        void trackFunnelEvent({ event: "upgrade_dismissed", source: "upgrade_alert", channel: "app" });
      },
    },
    {
      text: "See plans",
      onPress: () => {
        void trackFunnelEvent({ event: "upgrade_clicked", source: "upgrade_alert", channel: "app" });
        router.push("/(app)/pro");
      },
    },
  ]);
};
