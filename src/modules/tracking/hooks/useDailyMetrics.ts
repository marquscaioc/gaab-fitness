import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getTodayMetrics, upsertDailyMetric } from '../api/daily-metrics';

export function useTodayMetrics(userId: string | undefined) {
  return useQuery({
    queryKey: ['daily-metrics', userId, 'today'],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await getTodayMetrics(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpdateMetric(userId: string | undefined) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await upsertDailyMetric(userId, today, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-metrics', userId, 'today'] });
    },
  });
}
