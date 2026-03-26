import { supabase } from '~/src/shared/lib/supabase';

export async function getPublishedPrograms() {
  return supabase
    .from('programs')
    .select('*')
    .eq('is_published', true)
    .order('participant_count', { ascending: false });
}

export async function getProgramById(id: string) {
  return supabase
    .from('programs')
    .select('*, program_weeks(*, program_sessions(*))')
    .eq('id', id)
    .single();
}

export async function getUserEnrollments(userId: string) {
  return supabase
    .from('program_enrollments')
    .select('*, programs(*)')
    .eq('user_id', userId)
    .eq('is_active', true);
}

export async function enrollInProgram(userId: string, programId: string) {
  return supabase
    .from('program_enrollments')
    .insert({ user_id: userId, program_id: programId })
    .select()
    .single();
}

export async function advanceEnrollment(
  enrollmentId: string,
  currentWeek: number,
  currentSession: number
) {
  return supabase
    .from('program_enrollments')
    .update({ current_week: currentWeek, current_session: currentSession })
    .eq('id', enrollmentId)
    .select()
    .single();
}

export async function completeProgram(enrollmentId: string) {
  return supabase
    .from('program_enrollments')
    .update({ is_active: false, completed_at: new Date().toISOString() })
    .eq('id', enrollmentId);
}
