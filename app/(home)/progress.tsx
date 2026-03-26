import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useStats } from '~/src/modules/analytics/hooks/useStats';
import { useQuery } from '@tanstack/react-query';
import { getPersonalRecords } from '~/src/modules/analytics/api/personal-records';

type Period = 'week' | 'month' | 'quarter' | 'year';

export default function ProgressScreen() {
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const userId = session?.user?.id;
  const [period, setPeriod] = useState<Period>('month');

  const { data: stats, isLoading: statsLoading } = useStats(userId, { period });
  const { data: prs } = useQuery({
    queryKey: ['prs', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await getPersonalRecords(userId);
      return data || [];
    },
    enabled: !!userId,
  });

  const chartConfig = {
    backgroundGradientFrom: '#1f2937',
    backgroundGradientTo: '#1f2937',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    barPercentage: 0.6,
    propsForBackgroundLines: { stroke: '#374151' },
  };

  const volumeData: { date: string; volume_kg: number }[] = stats?.volume_over_time || [];
  const frequencyData: { weekday: string; sessions: number }[] = stats?.frequency || [];

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView
        className="flex-1"
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View className="border-b border-gray-800 px-6 py-4">
          <Text className="text-2xl font-bold text-green-500">Progress</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Period selector */}
          <View className="flex-row gap-2 px-4 pt-4">
            {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                className={`flex-1 rounded-lg py-2 ${period === p ? 'bg-green-700' : 'bg-gray-800'}`}>
                <Text className="text-center text-xs capitalize text-white">{p}</Text>
              </Pressable>
            ))}
          </View>

          {statsLoading ? (
            <ActivityIndicator size="large" color="#22c55e" className="mt-10" />
          ) : (
            <>
              {/* Summary cards */}
              <View className="flex-row gap-3 px-4 pt-4">
                <View className="flex-1 rounded-xl bg-gray-800 p-4">
                  <Text className="text-xs text-gray-400">Workouts</Text>
                  <Text className="mt-1 text-2xl font-bold text-white">{stats?.total_sessions || 0}</Text>
                </View>
                <View className="flex-1 rounded-xl bg-gray-800 p-4">
                  <Text className="text-xs text-gray-400">Total Volume</Text>
                  <Text className="mt-1 text-2xl font-bold text-white">
                    {volumeData.reduce((s, v) => s + v.volume_kg, 0) > 1000
                      ? `${(volumeData.reduce((s, v) => s + v.volume_kg, 0) / 1000).toFixed(1)}t`
                      : `${volumeData.reduce((s, v) => s + v.volume_kg, 0).toFixed(0)}kg`}
                  </Text>
                </View>
              </View>

              {/* Volume chart */}
              {volumeData.length > 1 && (
                <View className="px-4 pt-4">
                  <Text className="mb-2 text-base font-semibold text-white">Volume Over Time</Text>
                  <LineChart
                    data={{
                      labels: volumeData.slice(-7).map((v) => v.date.slice(5)),
                      datasets: [{ data: volumeData.slice(-7).map((v) => v.volume_kg || 0) }],
                    }}
                    width={width - 32}
                    height={200}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    }}
                    bezier
                    style={{ borderRadius: 12 }}
                  />
                </View>
              )}

              {/* Frequency chart */}
              {frequencyData.some((f) => f.sessions > 0) && (
                <View className="px-4 pt-4">
                  <Text className="mb-2 text-base font-semibold text-white">Workout Frequency</Text>
                  <BarChart
                    data={{
                      labels: frequencyData.map((f) => f.weekday),
                      datasets: [{ data: frequencyData.map((f) => f.sessions) }],
                    }}
                    width={width - 32}
                    height={180}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    }}
                    style={{ borderRadius: 12 }}
                  />
                </View>
              )}
            </>
          )}

          {/* Personal Records */}
          <View className="px-4 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-white">Personal Records</Text>
              <Pressable onPress={() => router.push('/progress/add-pr')}>
                <Text className="text-sm text-green-400">+ Add PR</Text>
              </Pressable>
            </View>

            {!prs || prs.length === 0 ? (
              <View className="mt-3 items-center rounded-xl bg-gray-800 p-6">
                <FontAwesome name="trophy" size={30} color="#4b5563" />
                <Text className="mt-2 text-gray-400">No personal records yet</Text>
                <Text className="mt-1 text-xs text-gray-500">
                  PRs are auto-detected when you complete workouts, or add them manually.
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-2">
                {prs.map((pr: any) => {
                  const values = (pr.pr_values || []).sort(
                    (a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                  );
                  const latest = values[0];
                  const previous = values[1];
                  const improved = previous && latest && latest.value > previous.value;

                  return (
                    <View key={pr.id} className="flex-row items-center justify-between rounded-xl bg-gray-800 p-4">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-white">{pr.name}</Text>
                        <Text className="text-xs capitalize text-gray-400">{pr.record_type}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xl font-bold text-green-400">
                          {latest ? `${latest.value} ${latest.unit || ''}` : '--'}
                        </Text>
                        {improved && (
                          <Text className="text-xs text-green-500">
                            ↑ from {previous.value}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
