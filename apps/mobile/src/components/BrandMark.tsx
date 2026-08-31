import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type BrandMarkProps = {
  onPress?: () => void;
  showImage?: boolean;
  size?: "header" | "auth";
  /** Hide tagline and shrink wordmark — used on narrow phone headers. */
  compact?: boolean;
};

export const BrandMark = ({
  onPress,
  showImage = false,
  size = "header",
  compact = false,
}: BrandMarkProps) => {
  const { colors } = useTheme();
  const isAuth = size === "auth";
  const content = (
    <View style={[styles.wrap, isAuth && styles.wrapAuth]}>
      {showImage ? (
        <Image
          source={require("../../assets/images/umbil-logo.png")}
          style={[styles.image, isAuth && styles.imageAuth]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="Umbil"
        />
      ) : (
        <Text
          style={[
            styles.logo,
            { color: colors.primary },
            isAuth && styles.logoAuth,
            compact && styles.logoCompact,
          ]}
          numberOfLines={1}
        >
          Umbil
        </Text>
      )}
      {compact ? null : (
        <Text
          style={[
            styles.tagline,
            { color: colors.textMuted },
            isAuth && styles.taglineAuth,
          ]}
          numberOfLines={1}
        >
          Your Medical Lifeline
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel="Go home"
        style={styles.press}
      >
        {content}
      </Pressable>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  press: { alignItems: "center", zIndex: 3 },
  wrap: { alignItems: "center" },
  wrapAuth: { marginBottom: spacing.lg },
  image: { width: 40, height: 40, marginBottom: 6 },
  imageAuth: { width: 72, height: 72, marginBottom: spacing.sm },
  logo: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.56,
  },
  logoAuth: { fontSize: 32 },
  logoCompact: { fontSize: 22, letterSpacing: -0.4 },
  tagline: { fontFamily: fonts.medium, fontSize: 13 },
  taglineAuth: { fontSize: 14 },
});
