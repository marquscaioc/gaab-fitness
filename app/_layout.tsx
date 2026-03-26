import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { queryClient } from '~/src/shared/lib/query-client';
import { AuthProvider } from '~/src/modules/auth/hooks/useSession';

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Slot />
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryClientProvider>
  );
}
