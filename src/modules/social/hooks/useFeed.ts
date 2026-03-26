import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getFeedPosts } from '../api/feed';
import { getFriends, getPendingRequests } from '../api/friendships';

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await getFeedPosts(20, pageParam);
      if (error) throw error;
      return data || [];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1]?.created_at;
    },
  });
}

export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: ['friends', userId],
    queryFn: async () => {
      if (!userId) return [];
      return getFriends(userId);
    },
    enabled: !!userId,
  });
}

export function usePendingRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ['pending-requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getPendingRequests(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
