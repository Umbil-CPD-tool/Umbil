import { STUDENT_PRO_OFFER } from "@umbil/shared";
import { router } from "expo-router";
import { Alert } from "react-native";

import { trackFunnelEvent } from "./api";

export const showProLimitAlert = (detail: string) => {
  Alert.alert("Unlock Umbil Pro", `${detail} Free is 10 questions, 1 tool, and 1 learning log a month. Pro keeps that clinic work in one place. ${STUDENT_PRO_OFFER}`, [
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
