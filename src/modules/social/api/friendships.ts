import { supabase } from '~/src/shared/lib/supabase';

export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:requester_id(id, username, display_name, avatar_url), addressee:addressee_id(id, username, display_name, avatar_url)')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;

  return (data || []).map((f: any) => {
    const friend = f.requester_id === userId ? f.addressee : f.requester;
    return { ...friend, friendshipId: f.id };
  });
}

export async function getPendingRequests(userId: string) {
  return supabase
    .from('friendships')
    .select('*, requester:requester_id(id, username, display_name, avatar_url)')
    .eq('addressee_id', userId)
    .eq('status', 'pending');
}

export async function sendFriendRequest(fromUserId: string, toUserId: string) {
  return supabase
    .from('friendships')
    .insert({ requester_id: fromUserId, addressee_id: toUserId, status: 'pending' })
    .select()
    .single();
}

export async function acceptFriendRequest(friendshipId: string) {
  return supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();
}

export async function rejectFriendRequest(friendshipId: string) {
  return supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function removeFriend(friendshipId: string) {
  return supabase.from('friendships').delete().eq('id', friendshipId);
}
