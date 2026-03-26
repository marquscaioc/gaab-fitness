import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/database';

const isWeb = typeof window !== 'undefined' && typeof localStorage !== 'undefined' && !('ReactNativeWebView' in window);

const webAdapter = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
  },
};

function createStorageAdapter() {
  if (isWeb) return webAdapter;

  try {
    const MMKV = require('react-native-mmkv').MMKV;
    const mmkv = new MMKV({ id: 'supabase-storage' });
    return {
      getItem: (key: string): string | null => mmkv.getString(key) ?? null,
      setItem: (key: string, value: string): void => mmkv.set(key, value),
      removeItem: (key: string): void => mmkv.delete(key),
    };
  } catch {
    return webAdapter;
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
