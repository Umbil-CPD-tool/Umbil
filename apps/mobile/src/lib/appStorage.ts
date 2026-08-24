import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * SecureStore is unavailable / broken on Expo web.
 * Use localStorage on web; SecureStore on native.
 */
export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* ignore */
    }
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};
