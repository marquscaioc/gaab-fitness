import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getTodayMeals, addMeal, deleteMeal } from '../api/meals';

export function useTodayMeals(userId: string | undefined) {
  return useQuery({
    queryKey: ['meals', userId, 'today'],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getTodayMeals(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useAddMeal(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meal: { name: string; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; category?: 'breakfast' | 'lunch' | 'dinner' | 'snack' }) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await addMeal(userId, meal);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', userId, 'today'] });
    },
  });
}

export function useDeleteMeal(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await deleteMeal(mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', userId, 'today'] });
    },
  });
}
