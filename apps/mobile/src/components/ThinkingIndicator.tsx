import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { fonts } from "@/theme/typography";

/** Matches website `.loading-indicator`: rotating status copy + three pulsing dots. */
export const ThinkingIndicator = ({ message }: { message: string }) => {
  const { colors } = useTheme();
  const a = useRef(new Animated.Value(0.2)).current;
  const b = useRef(new Animated.Value(0.2)).current;
  const c = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const dots = [a, b, c];
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.2,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [a, b, c]);

  return (
    <View style={styles.row}>
      <Text style={[styles.text, { color: colors.textMuted }]}>{message}</Text>
      {[a, b, c].map((opacity, i) => (
        <Animated.Text
          key={i}
          style={[styles.dot, { color: colors.textMuted, opacity }]}
        >
          •
        </Animated.Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  dot: {
    fontSize: 18,
    lineHeight: 18,
  },
});
