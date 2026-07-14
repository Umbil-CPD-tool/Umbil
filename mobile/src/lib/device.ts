import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'umbil-device-id';

function createDeviceId(): string {
  return `umbil-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const next = createDeviceId();
    window.localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  }

  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const next = createDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, next);
  return next;
}
