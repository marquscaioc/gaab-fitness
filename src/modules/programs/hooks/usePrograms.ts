import { useQuery } from '@tanstack/react-query';

import { getPublishedPrograms, getProgramById, getUserEnrollments } from '../api/programs';

export function usePublishedPrograms() {
  return useQuery({
    queryKey: ['programs', 'published'],
    queryFn: async () => {
      const { data, error } = await getPublishedPrograms();
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['program', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await getProgramById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: ['enrollments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getUserEnrollments(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
