import { supabase } from '~/src/shared/lib/supabase';

export async function getNotifications(userId: string, limit = 30) {
  return supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function getUnreadCount(userId: string) {
  return supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function markAsRead(notificationId: string) {
  return supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
}

export async function markAllAsRead(userId: string) {
  return supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}
