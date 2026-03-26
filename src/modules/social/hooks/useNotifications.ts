import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../api/notifications';
import { supabase } from '~/src/shared/lib/supabase';

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getNotifications(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useUnreadCount(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await getUnreadCount(userId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Poll every 30s
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-count', userId] });
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

export function useMarkAsRead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });
}

export function useMarkAllAsRead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      return markAllAsRead(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-count', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });
}
