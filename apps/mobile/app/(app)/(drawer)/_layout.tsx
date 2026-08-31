import { Drawer } from "expo-router/drawer";
import { useWindowDimensions } from "react-native";

import { SideMenu } from "@/components/SideMenu";
import { useTheme } from "@/providers/ThemeProvider";

/**
 * Gemini/ChatGPT-style shell: one primary screen (chat) with the rest of the
 * app reachable via a swipeable side drawer instead of a bottom tab bar.
 * Each screen renders its own `ChromeHeader`, so the drawer's native header
 * stays hidden.
 */
export default function DrawerLayout() {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  // A single resolved pixel value — mixing a percentage `width` with
  // `maxWidth` is unreliable across Yoga/react-native-web and was causing
  // the drawer panel to size itself off its content instead of the screen,
  // producing the clipped/overflowing layout.
  const drawerWidth = Math.min(windowWidth * 0.84, 340);
  const isTablet = windowWidth >= 768;

  return (
    <Drawer
      initialRouteName="chat"
      drawerContent={(props) => <SideMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEdgeWidth: isTablet ? 100 : 60,
        overlayColor: "rgba(0,0,0,0.45)",
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: colors.surface,
        },
      }}
    >
      <Drawer.Screen name="chat" />
      <Drawer.Screen name="cpd" />
      <Drawer.Screen name="portfolio" />
      <Drawer.Screen name="account" />
    </Drawer>
  );
}
