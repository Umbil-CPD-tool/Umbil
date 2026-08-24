import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
});
