import { supabase } from '~/src/shared/lib/supabase';

export async function getActiveChallenges() {
  return supabase
    .from('challenges')
    .select('*, challenge_participants(*, profiles:user_id(username, display_name, avatar_url))')
    .gte('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false });
}

export async function getChallengeById(id: string) {
  return supabase
    .from('challenges')
    .select('*, challenge_participants(*, profiles:user_id(username, display_name, avatar_url))')
    .eq('id', id)
    .single();
}

export async function createChallenge(
  userId: string,
  data: {
    name: string;
    description?: string;
    challengeType: 'volume' | 'frequency' | 'streak' | 'distance' | 'custom';
    targetValue?: number;
    targetUnit?: string;
    startsAt: string;
    endsAt: string;
  }
) {
  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({
      creator_id: userId,
      name: data.name,
      description: data.description || null,
      challenge_type: data.challengeType,
      target_value: data.targetValue || null,
      target_unit: data.targetUnit || null,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-join creator
  await supabase
    .from('challenge_participants')
    .insert({ challenge_id: challenge.id, user_id: userId });

  return challenge;
}

export async function joinChallenge(challengeId: string, userId: string) {
  return supabase
    .from('challenge_participants')
    .insert({ challenge_id: challengeId, user_id: userId })
    .select()
    .single();
}

export async function leaveChallenge(challengeId: string, userId: string) {
  return supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
}
