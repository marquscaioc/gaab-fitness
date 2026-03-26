import { Platform } from 'react-native';

// MMKV is not available on web -- fallback to localStorage
let storageBackend: {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
};

if (Platform.OS === 'web') {
  storageBackend = {
    getString(key: string) {
      try {
        return localStorage.getItem(key) ?? undefined;
      } catch {
        return undefined;
      }
    },
    set(key: string, value: string) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    delete(key: string) {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
} else {
  const { MMKV } = require('react-native-mmkv');
  storageBackend = new MMKV({ id: 'gaab-app' });
}

export const storage = storageBackend;

export const mmkvStorage = {
  getItem(key: string): string | null {
    return storage.getString(key) ?? null;
  },
  setItem(key: string, value: string): void {
    storage.set(key, value);
  },
  removeItem(key: string): void {
    storage.delete(key);
  },
};
