import { supabase } from '~/src/shared/lib/supabase';

export async function getPersonalRecords(userId: string) {
  return supabase
    .from('personal_records')
    .select('*, pr_values(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function createPR(
  userId: string,
  data: {
    name: string;
    exerciseId?: string;
    recordType: 'weight' | 'reps' | 'time' | 'distance';
    initialValue?: number;
    unit?: string;
  }
) {
  const { data: pr, error: prError } = await supabase
    .from('personal_records')
    .insert({
      user_id: userId,
      name: data.name,
      exercise_id: data.exerciseId || null,
      record_type: data.recordType,
    })
    .select()
    .single();

  if (prError) throw prError;

  if (data.initialValue != null) {
    await supabase.from('pr_values').insert({
      pr_id: pr.id,
      value: data.initialValue,
      unit: data.unit || null,
    });
  }

  return pr;
}

export async function addPRValue(prId: string, value: number, unit?: string, date?: string) {
  return supabase
    .from('pr_values')
    .insert({
      pr_id: prId,
      value,
      unit: unit || null,
      recorded_at: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();
}

export async function deletePR(id: string) {
  return supabase.from('personal_records').delete().eq('id', id);
}
