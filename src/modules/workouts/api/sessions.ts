import { supabase } from '~/src/shared/lib/supabase';
import type { ActiveSession } from '../store/workoutSessionStore';

export async function getWorkoutHistory(userId: string, limit = 20, offset = 0) {
  return supabase
    .from('workout_sessions')
    .select('*, session_exercises(*, exercises(*), exercise_sets(*))', { count: 'exact' })
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function getSessionById(id: string) {
  return supabase
    .from('workout_sessions')
    .select('*, session_exercises(*, exercises(*), exercise_sets(*))')
    .eq('id', id)
    .single();
}

export async function saveCompletedSession(
  userId: string,
  session: ActiveSession,
  durationS: number,
  rating?: number,
  notes?: string
) {
  // 1. Insert workout session
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      id: session.id,
      user_id: userId,
      template_id: session.templateId,
      name: session.name,
      started_at: session.startedAt,
      ended_at: new Date().toISOString(),
      duration_s: durationS,
      rating: rating || null,
      notes: notes || null,
      is_synced: true,
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // 2. Insert session exercises
  for (const exercise of session.exercises) {
    const { data: seData, error: seError } = await supabase
      .from('session_exercises')
      .insert({
        session_id: sessionData.id,
        exercise_id: exercise.exerciseId,
        sort_order: exercise.sortOrder,
      })
      .select()
      .single();

    if (seError) throw seError;

    // 3. Insert exercise sets
    const completedSets = exercise.sets.filter((s) => s.completed);
    if (completedSets.length > 0) {
      const { error: setsError } = await supabase
        .from('exercise_sets')
        .insert(
          completedSets.map((set) => ({
            session_exercise_id: seData.id,
            set_index: set.setIndex,
            set_type: set.setType,
            weight: set.weight,
            weight_unit: set.weightUnit,
            reps: set.reps,
            duration_s: set.durationS,
            distance_m: set.distanceM,
            completed: true,
            rpe: set.rpe,
          }))
        );

      if (setsError) throw setsError;
    }
  }

  return sessionData;
}

export async function deleteSession(id: string) {
  return supabase.from('workout_sessions').delete().eq('id', id);
}
