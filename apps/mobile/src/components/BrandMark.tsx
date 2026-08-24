import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";
import { spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type BrandMarkProps = {
  onPress?: () => void;
  showImage?: boolean;
  size?: "header" | "auth";
};

export const BrandMark = ({
  onPress,
  showImage = false,
  size = "header",
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
        />
      ) : null}
      <View style={styles.textCol}>
        <Text
          style={[
            styles.logo,
            { color: colors.primary },
            isAuth && styles.logoAuth,
          ]}
        >
          Umbil
        </Text>
        <Text
          style={[
            styles.tagline,
            { color: colors.textMuted },
            isAuth && styles.taglineAuth,
          ]}
        >
          Your Medical Lifeline
        </Text>
      </View>
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
  press: { alignItems: "center" },
  wrap: { alignItems: "center" },
  wrapAuth: { marginBottom: spacing.lg },
  textCol: { alignItems: "center" },
  image: { width: 40, height: 40, marginBottom: 6 },
  imageAuth: { width: 64, height: 64, marginBottom: spacing.sm },
  logo: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.56,
  },
  logoAuth: { fontSize: 32 },
  tagline: { fontFamily: fonts.medium, fontSize: 13 },
  taglineAuth: { fontSize: 14 },
});
