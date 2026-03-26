// Web-safe storage abstraction
// On web: uses localStorage
// On native: uses MMKV (loaded via platform-specific file)

const isWeb = typeof window !== 'undefined' && typeof localStorage !== 'undefined' && !('ReactNativeWebView' in window);

const webStorage = {
  getString(key: string): string | undefined {
    try { return localStorage.getItem(key) ?? undefined; } catch { return undefined; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch {}
  },
  delete(key: string): void {
    try { localStorage.removeItem(key); } catch {}
  },
};

let storageBackend = webStorage;

if (!isWeb) {
  try {
    // This will only succeed on native platforms
    const MMKV = require('react-native-mmkv').MMKV;
    storageBackend = new MMKV({ id: 'gaab-app' });
  } catch {
    // Fallback to web storage if MMKV fails
    storageBackend = webStorage;
  }
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
