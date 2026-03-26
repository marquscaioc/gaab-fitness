import { useQuery } from '@tanstack/react-query';

import { supabase } from '~/src/shared/lib/supabase';

interface StatsParams {
  period: 'week' | 'month' | 'quarter' | 'year';
  date?: string;
}

export function useStats(userId: string | undefined, params: StatsParams) {
  return useQuery({
    queryKey: ['statistics', userId, params.period, params.date],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.functions.invoke('calculate-statistics', {
        body: { period: params.period, date: params.date },
      });

      // Fallback: compute client-side if Edge Function not deployed
      if (error) {
        return computeStatsLocally(userId, params);
      }
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

async function computeStatsLocally(userId: string, params: StatsParams) {
  const endDate = new Date(params.date || new Date().toISOString().split('T')[0]);
  const startDate = new Date(endDate);

  if (params.period === 'week') startDate.setDate(endDate.getDate() - 7);
  else if (params.period === 'month') startDate.setMonth(endDate.getMonth() - 1);
  else if (params.period === 'quarter') startDate.setMonth(endDate.getMonth() - 3);
  else startDate.setFullYear(endDate.getFullYear() - 1);

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('*, session_exercises(*, exercise_sets(weight, reps, completed, duration_s))')
    .eq('user_id', userId)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString())
    .order('started_at', { ascending: true });

  // Volume over time
  const volumeByDate: Record<string, number> = {};
  for (const s of sessions || []) {
    const date = s.started_at.split('T')[0];
    const vol = ((s as any).session_exercises || []).reduce((sum: number, se: any) => {
      return sum + (se.exercise_sets || []).reduce((ss: number, set: any) => {
        return ss + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0);
      }, 0);
    }, 0);
    volumeByDate[date] = (volumeByDate[date] || 0) + vol;
  }

  // Frequency by weekday
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const freq: Record<string, number> = {};
  weekdays.forEach((d) => (freq[d] = 0));
  for (const s of sessions || []) {
    const d = weekdays[new Date(s.started_at).getDay()];
    freq[d]++;
  }

  return {
    volume_over_time: Object.entries(volumeByDate).map(([date, v]) => ({ date, volume_kg: v })),
    frequency: Object.entries(freq).map(([weekday, sessions]) => ({ weekday, sessions })),
    total_sessions: sessions?.length || 0,
    muscle_heatmap: [],
    category_split: [],
    pr_timeline: [],
  };
}
