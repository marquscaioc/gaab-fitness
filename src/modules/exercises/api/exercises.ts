import { supabase } from '~/src/shared/lib/supabase';

export interface ExerciseFilters {
  targetMuscles?: string[];
  equipment?: string[];
  bodyParts?: string[];
  secondaryMuscles?: string[];
  isCustom?: boolean;
  limit?: number;
  offset?: number;
}

export async function getExercises(filters: ExerciseFilters = {}) {
  const { targetMuscles, equipment, bodyParts, secondaryMuscles, limit = 20, offset = 0 } = filters;

  let query = supabase
    .from('exercises')
    .select('*', { count: 'exact' });

  if (targetMuscles?.length) {
    query = query.overlaps('target_muscles', targetMuscles);
  }
  if (equipment?.length) {
    query = query.overlaps('equipment', equipment);
  }
  if (bodyParts?.length) {
    query = query.overlaps('body_parts', bodyParts);
  }
  if (secondaryMuscles?.length) {
    query = query.overlaps('secondary_muscles', secondaryMuscles);
  }

  query = query
    .order('name')
    .range(offset, offset + limit - 1);

  return query;
}

export async function searchExercises(query: string, limit: number = 20) {
  return supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(limit);
}

export async function getExerciseById(id: string) {
  return supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .single();
}

export async function createCustomExercise(data: {
  name: string;
  targetMuscles: string[];
  equipment: string[];
  bodyParts: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  exerciseType?: string;
  mechanicsType?: string;
}) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Not authenticated');

  return supabase
    .from('exercises')
    .insert({
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: data.name,
      target_muscles: data.targetMuscles,
      equipment: data.equipment,
      body_parts: data.bodyParts,
      secondary_muscles: data.secondaryMuscles || [],
      instructions: data.instructions || [],
      exercise_type: data.exerciseType || null,
      mechanics_type: data.mechanicsType || null,
      is_custom: true,
      created_by: userId,
    })
    .select()
    .single();
}

export async function getExercisesByMuscle(
  muscle: string,
  equipment?: string[],
  options: { includePrimary?: boolean; includeSecondary?: boolean; limit?: number } = {}
) {
  const { includePrimary = true, includeSecondary = false, limit = 20 } = options;

  let query = supabase.from('exercises').select('*');

  if (includePrimary && includeSecondary) {
    query = query.or(`target_muscles.cs.{${muscle}},secondary_muscles.cs.{${muscle}}`);
  } else if (includePrimary) {
    query = query.contains('target_muscles', [muscle]);
  } else if (includeSecondary) {
    query = query.contains('secondary_muscles', [muscle]);
  }

  if (equipment?.length) {
    query = query.overlaps('equipment', equipment);
  }

  return query.limit(limit);
}
