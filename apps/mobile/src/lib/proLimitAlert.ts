import { STUDENT_PRO_OFFER } from "@umbil/shared";
import { router } from "expo-router";
import { Alert } from "react-native";

export const openStudentEmail = () => {
  router.push({ pathname: "/(app)/(drawer)/account", params: { student: "1" } });
};

export const showProLimitAlert = (detail: string) => {
  Alert.alert("Unlock Umbil Pro", `${detail} ${STUDENT_PRO_OFFER}`, [
    { text: "Not now", style: "cancel" },
    { text: "Student email", onPress: openStudentEmail },
    { text: "Unlock your free month", onPress: () => router.push("/(app)/pro") },
  ]);
};
