import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";

import { assertPublicEnv } from "./env";

/**
 * Expo SecureStore rejects values over ~2048 bytes (Android Keystore limit).
 * A Supabase session (access + refresh token + user metadata) regularly
 * exceeds this, which made `setItemAsync` fail silently and log users out
 * on next launch. Instead we generate a random AES-256 key, store *that*
 * (small) key in SecureStore, and store the encrypted session in
 * AsyncStorage (no size limit). This is Supabase's official pattern for
 * Expo apps — see https://supabase.com/docs/reference/javascript/initializing.
 */
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      // Key/value out of sync (e.g. reinstalled keystore) — treat as signed out.
      await this.removeItem(key);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

/** Plain localStorage on Expo web — SecureStore/AsyncStorage native modules don't apply. */
const WebStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore quota errors in preview */
    }
  },
  removeItem: async (key: string) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, "public", any>;

let client: AnySupabase | null = null;

/** Untyped client — same tables/RLS as web; avoids generated Database generics in mobile. */
export const getSupabase = (): AnySupabase => {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = assertPublicEnv();

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === "web" ? WebStorageAdapter : new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }) as AnySupabase;

  if (Platform.OS !== "web") {
    // JS timers pause while the app is backgrounded, so the scheduled token
    // refresh never fires — leaving an expired session on resume. Explicitly
    // start/stop the refresh loop with app foreground state so users never
    // get silently logged out after leaving the app open in the background.
    AppState.addEventListener("change", (state) => {
      if (!client) return;
      if (state === "active") {
        void client.auth.startAutoRefresh();
      } else {
        void client.auth.stopAutoRefresh();
      }
    });
  }

  return client;
};
