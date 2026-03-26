import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';

import CircularProgress from './ProgressCircle';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useTodayMetrics } from '~/src/modules/tracking/hooks/useDailyMetrics';

interface ProgressTrackerProps {
  label: string;
  color: string;
  storageKey?: string; // kept for backward compat but ignored
  goal: number;
}

export default function ProgressTracker({ label, color, goal }: ProgressTrackerProps) {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: metrics, isLoading, refetch } = useTodayMetrics(userId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  const progress = metrics?.water_ml || 0;

  return (
    <View>
      <CircularProgress
        progress={progress}
        goal={goal}
        label={label}
        color={color}
        iconName="tint"
      />
      <Text className="mt-2 text-center text-white">
        {progress} / {goal} ml
      </Text>
    </View>
  );
}
