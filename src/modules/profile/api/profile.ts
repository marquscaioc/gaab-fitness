import { supabase } from '~/src/shared/lib/supabase';

export async function getProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

export async function updateProfile(
  userId: string,
  updates: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    unit_system?: 'metric' | 'imperial';
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other';
    height_cm?: number;
    weight_kg?: number;
    fitness_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    onboarding_completed?: boolean;
  }
) {
  return supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
}

export async function searchProfiles(query: string, limit = 20) {
  return supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);
}
