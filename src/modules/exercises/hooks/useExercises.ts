import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import { getExercises, searchExercises, getExerciseById, type ExerciseFilters } from '../api/exercises';

export function useExercises(filters: ExerciseFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['exercises', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error, count } = await getExercises({
        ...filters,
        offset: pageParam,
        limit: filters.limit || 20,
      });
      if (error) throw error;
      return { data: data || [], count, nextOffset: pageParam + (filters.limit || 20) };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.count || lastPage.nextOffset >= lastPage.count) return undefined;
      return lastPage.nextOffset;
    },
  });
}

export function useExerciseSearch(query: string) {
  return useQuery({
    queryKey: ['exercise-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await searchExercises(query);
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await getExerciseById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
