import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View, ActivityIndicator, useWindowDimensions, Pressable, Text } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ProgressBar } from 'react-native-paper';

import { Button } from './Button';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useTodayMetrics, useUpdateMetric } from '~/src/modules/tracking/hooks/useDailyMetrics';

const DAILY_GOAL = 2000;

export default function WaterIntake() {
  const { width, height } = useWindowDimensions();
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: metrics, isLoading, refetch } = useTodayMetrics(userId);
  const updateMetric = useUpdateMetric(userId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const todayAmount = metrics?.water_ml || 0;

  const addWater = () => {
    updateMetric.mutate({ water_ml: todayAmount + 200 });
  };

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  // Simple bar chart with just today's data as context
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  const chartData = daysOfWeek.map((_, i) => (i === todayIndex ? todayAmount : 0));

  const data = {
    labels: daysOfWeek,
    datasets: [{ data: chartData }],
  };

  return (
    <View className="p-4">
      {/* Daily progress */}
      <View className="my-2 items-center">
        <Text className="text-xl font-semibold text-white">
          Today: {todayAmount}ml / {DAILY_GOAL}ml
        </Text>
        <ProgressBar
          progress={Math.min(todayAmount / DAILY_GOAL, 1)}
          color="#00bcd4"
          className="w-11/12 py-4"
        />
      </View>

      {/* Chart */}
      <View>
        <BarChart
          data={data}
          width={width - 40}
          height={height / 4}
          yAxisLabel=""
          yAxisSuffix="ml"
          chartConfig={{
            backgroundGradientFrom: '#1a202c',
            backgroundGradientTo: '#1a202c',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(103, 232, 249, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            barPercentage: 0.6,
          }}
          style={{ borderRadius: 8, alignSelf: 'center' }}
        />
      </View>

      {/* Add button */}
      <Button
        title="Add Water (200ml)"
        className="m-6"
        style={{ backgroundColor: 'green' }}
        onPress={addWater}
      />
      <Text className="text-center text-sm text-gray-400">
        Water intake is synced to your account. Track daily hydration.
      </Text>
    </View>
  );
}
