import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { appStorage } from "./appStorage";

const KEY = "umbil_device_id";

export const getDeviceId = async (): Promise<string> => {
  if (Platform.OS === "web") {
    try {
      let id = globalThis.localStorage?.getItem(KEY);
      if (!id) {
        id = Crypto.randomUUID();
        globalThis.localStorage?.setItem(KEY, id);
      }
      return id;
    } catch {
      return Crypto.randomUUID();
    }
  }

  let id = await appStorage.getItem(KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await appStorage.setItem(KEY, id);
  }
  return id;
};

export const createId = () => Crypto.randomUUID();
