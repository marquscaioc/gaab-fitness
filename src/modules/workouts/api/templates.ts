import { supabase } from '~/src/shared/lib/supabase';

export async function getTemplates(userId: string) {
  return supabase
    .from('workout_templates')
    .select('*, workout_template_exercises(*, exercises(*))')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
}

export async function getTemplateById(id: string) {
  return supabase
    .from('workout_templates')
    .select('*, workout_template_exercises(*, exercises(*))')
    .eq('id', id)
    .single();
}

export async function createTemplate(
  userId: string,
  template: { name: string; description?: string; category?: string },
  exercises: { exerciseId: string; sortOrder: number; defaultSets?: number; defaultReps?: number; restSeconds?: number }[]
) {
  const { data: templateData, error: templateError } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, ...template })
    .select()
    .single();

  if (templateError) throw templateError;

  if (exercises.length > 0) {
    const { error: exercisesError } = await supabase
      .from('workout_template_exercises')
      .insert(
        exercises.map((ex) => ({
          template_id: templateData.id,
          exercise_id: ex.exerciseId,
          sort_order: ex.sortOrder,
          default_sets: ex.defaultSets || 3,
          default_reps: ex.defaultReps || 10,
          rest_seconds: ex.restSeconds || 90,
        }))
      );

    if (exercisesError) throw exercisesError;
  }

  return templateData;
}

export async function deleteTemplate(id: string) {
  return supabase.from('workout_templates').delete().eq('id', id);
}

export async function updateTemplate(
  id: string,
  updates: { name?: string; description?: string; category?: string }
) {
  return supabase
    .from('workout_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}
