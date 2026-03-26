import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';

import CircularProgress from './ProgressCircle';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useTodayMeals } from '~/src/modules/tracking/hooks/useMeals';

export default function MainNutritionTrack() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: meals, isLoading, refetch } = useTodayMeals(userId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  const totalCalories = (meals || []).reduce(
    (sum, meal: any) => sum + (meal.calories || 0),
    0
  );
  const goal = 2500;

  return (
    <View>
      <CircularProgress
        progress={totalCalories}
        label="Calories"
        iconName="fire"
        color="#FFA500"
        goal={goal}
      />
      <Text className="text-center text-white">
        {totalCalories} / {goal} kcal
      </Text>
    </View>
  );
}
