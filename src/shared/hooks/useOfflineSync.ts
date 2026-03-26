import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';

import { getPendingMutations, dequeue } from '../lib/offline-queue';
import { supabase } from '../lib/supabase';

/**
 * Hook that listens for network connectivity changes.
 * When the device reconnects, it flushes all queued offline workout sessions
 * to the sync-workout-session Edge Function.
 */
export function useOfflineSync(userId: string | undefined) {
  const isFlushing = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && !isFlushing.current) {
        await flushQueue(userId);
      }
    });

    // Also try flushing on mount
    flushQueue(userId);

    return () => unsubscribe();
  }, [userId]);

  const flushQueue = async (uid: string) => {
    const pending = getPendingMutations();
    if (pending.length === 0 || isFlushing.current) return;

    isFlushing.current = true;

    try {
      const workoutSessions = pending
        .filter((m) => m.type === 'workout_session')
        .map((m) => m.payload);

      if (workoutSessions.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await supabase.functions.invoke('sync-workout-session', {
          body: { sessions: workoutSessions },
        });

        if (response.data?.synced) {
          // Remove synced items from queue
          for (const syncedId of response.data.synced) {
            const mutation = pending.find((m) => m.payload?.id === syncedId);
            if (mutation) dequeue(mutation.id);
          }
        }
      }

      // Flush other mutation types (generic)
      const otherMutations = pending.filter((m) => m.type !== 'workout_session');
      for (const mutation of otherMutations) {
        try {
          // Retry the stored mutation
          if (mutation.type === 'daily_metric') {
            await supabase.from('daily_metrics').upsert(mutation.payload, { onConflict: 'user_id,date' });
            dequeue(mutation.id);
          } else if (mutation.type === 'meal') {
            await supabase.from('meals').insert(mutation.payload);
            dequeue(mutation.id);
          }
        } catch {
          // Will retry on next connectivity change
        }
      }
    } finally {
      isFlushing.current = false;
    }
  };
}
