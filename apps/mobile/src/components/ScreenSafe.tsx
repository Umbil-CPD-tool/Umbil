import { useWindowDimensions, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Cap form/chat columns on iPad / Android tablets so they don't stretch edge-to-edge. */
export const CONTENT_MAX_WIDTH = 720;

export const useContentWidth = (maxWidth = CONTENT_MAX_WIDTH) => {
  const { width } = useWindowDimensions();
  return Math.min(width, maxWidth);
};

export const useBottomPad = (base = 24) => {
  const insets = useSafeAreaInsets();
  return base + insets.bottom;
};

/** Centered, inset-aware content style for ScrollView / FlatList containers. */
export const useCenteredContentStyle = (bottomBase = 32): ViewStyle => {
  const insets = useSafeAreaInsets();
  const maxWidth = useContentWidth();
  return {
    width: "100%",
    maxWidth,
    alignSelf: "center",
    paddingBottom: bottomBase + insets.bottom,
  };
};

type ScreenSafeProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padBottom?: boolean;
};

export const ScreenSafe = ({
  children,
  style,
  padBottom = true,
}: ScreenSafeProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, paddingBottom: padBottom ? insets.bottom : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
};
