import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webStore = {
  async getItemAsync(k) {
    try {
      return globalThis.localStorage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  async setItemAsync(k, v) {
    try {
      globalThis.localStorage?.setItem(k, v);
    } catch {}
  },
  async deleteItemAsync(k) {
    try {
      globalThis.localStorage?.removeItem(k);
    } catch {}
  },
};

const store = Platform.OS === 'web' ? webStore : SecureStore;

export async function setSecure(key, value) {
  if (value == null) return store.deleteItemAsync(key);
  return store.setItemAsync(key, typeof value === 'string' ? value : JSON.stringify(value));
}

export async function getSecure(key) {
  const v = await store.getItemAsync(key);
  if (v == null) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export async function clearSecure(key) {
  return store.deleteItemAsync(key);
}
