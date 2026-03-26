import { supabase } from '~/src/shared/lib/supabase';

export async function getTodayMetrics(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
}

export async function upsertDailyMetric(
  userId: string,
  date: string,
  updates: {
    steps?: number;
    water_ml?: number;
    calories_in?: number;
    calories_burned?: number;
    weight_kg?: number;
    body_fat_pct?: number;
    sleep_minutes?: number;
    hr_resting?: number;
    hrv?: number;
    notes?: string;
  }
) {
  return supabase
    .from('daily_metrics')
    .upsert(
      { user_id: userId, date, ...updates },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();
}

export async function getMetricsRange(userId: string, startDate: string, endDate: string) {
  return supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
}
