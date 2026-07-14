// mobile/src/lib/storage.ts

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SupportedStorage } from '@supabase/supabase-js';

const CHUNK_SIZE = 1800;
const META_SUFFIX = '__umbil_chunks';
const IS_WEB = Platform.OS === 'web';

function getBrowserStorage(): Storage | null {
  if (!IS_WEB || typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function removeNativeChunks(key: string): Promise<void> {
  const metaKey = `${key}${META_SUFFIX}`;
  const chunkCountValue = await SecureStore.getItemAsync(metaKey);
  const chunkCount = Number(chunkCountValue || 0);

  if (Number.isFinite(chunkCount) && chunkCount > 0) {
    await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.deleteItemAsync(`${key}__${index}`),
      ),
    );
  }

  await Promise.all([
    SecureStore.deleteItemAsync(metaKey),
    SecureStore.deleteItemAsync(key),
  ]);
}

export const secureStorageAdapter: SupportedStorage = {
  async getItem(key) {
    if (IS_WEB) {
      return getBrowserStorage()?.getItem(key) ?? null;
    }

    const chunkCountValue = await SecureStore.getItemAsync(
      `${key}${META_SUFFIX}`,
    );
    const chunkCount = Number(chunkCountValue || 0);

    if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        SecureStore.getItemAsync(`${key}__${index}`),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },

  async setItem(key, value) {
    if (IS_WEB) {
      getBrowserStorage()?.setItem(key, value);
      return;
    }

    await removeNativeChunks(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = value.match(
      new RegExp(`.{1,${CHUNK_SIZE}}`, 'g'),
    ) ?? [];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${key}__${index}`, chunk),
      ),
    );

    await SecureStore.setItemAsync(
      `${key}${META_SUFFIX}`,
      String(chunks.length),
    );
  },

  async removeItem(key) {
    if (IS_WEB) {
      getBrowserStorage()?.removeItem(key);
      return;
    }

    await removeNativeChunks(key);
  },
};