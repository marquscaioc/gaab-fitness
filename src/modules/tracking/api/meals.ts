import { supabase } from '~/src/shared/lib/supabase';

export async function getTodayMeals(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', `${today}T00:00:00`)
    .lte('logged_at', `${today}T23:59:59`)
    .order('logged_at', { ascending: false });
}

export async function addMeal(
  userId: string,
  meal: {
    name: string;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    category?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }
) {
  return supabase
    .from('meals')
    .insert({ user_id: userId, ...meal })
    .select()
    .single();
}

export async function deleteMeal(id: string) {
  return supabase.from('meals').delete().eq('id', id);
}
