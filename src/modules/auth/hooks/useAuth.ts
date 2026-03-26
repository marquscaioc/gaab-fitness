import { useCallback } from 'react';
import * as Linking from 'expo-linking';

import { supabase } from '~/src/shared/lib/supabase';

export function useAuth() {
  const signIn = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL('/');
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }, []);

  const signInWithApple = useCallback(async () => {
    const redirectTo = Linking.createURL('/');
    return supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo },
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email);
  }, []);

  return {
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    resetPassword,
  };
}
