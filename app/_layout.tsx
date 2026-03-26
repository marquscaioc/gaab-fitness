import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { queryClient } from '~/src/shared/lib/query-client';
import { AuthProvider, useSession } from '~/src/modules/auth/hooks/useSession';
import { useOfflineSync } from '~/src/shared/hooks/useOfflineSync';
import { ErrorBoundary } from '~/src/shared/components/ErrorBoundary';

function AppContent() {
  const { session } = useSession();
  useOfflineSync(session?.user?.id);

  return <Slot />;
}

export default function Layout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppContent />
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
