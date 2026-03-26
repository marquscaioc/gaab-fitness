import { Redirect, Stack } from 'expo-router';

import { useSession } from '~/src/modules/auth/hooks/useSession';

export default function AuthLayout() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;

  if (session) {
    return <Redirect href="/(home)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
