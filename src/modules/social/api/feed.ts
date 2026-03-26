import { supabase } from '~/src/shared/lib/supabase';

export async function getFeedPosts(limit = 20, cursor?: string) {
  let query = supabase
    .from('feed_posts')
    .select('*, profiles:user_id(username, display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  return query;
}

export async function createPost(
  userId: string,
  data: {
    postType: string;
    sessionId?: string;
    prId?: string;
    content?: string;
    visibility?: 'public' | 'friends' | 'private';
  }
) {
  return supabase
    .from('feed_posts')
    .insert({
      user_id: userId,
      post_type: data.postType,
      session_id: data.sessionId || null,
      pr_id: data.prId || null,
      content: data.content || null,
      visibility: data.visibility || 'friends',
    })
    .select()
    .single();
}

export async function deletePost(id: string) {
  return supabase.from('feed_posts').delete().eq('id', id);
}

export async function toggleReaction(postId: string, userId: string, emoji = 'fire') {
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return supabase.from('post_reactions').delete().eq('id', existing.id);
  }

  return supabase
    .from('post_reactions')
    .insert({ post_id: postId, user_id: userId, emoji })
    .select()
    .single();
}
