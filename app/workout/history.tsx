import { Entypo } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { getWorkoutHistory } from '~/src/modules/workouts/api/sessions';
import { formatDuration } from '~/src/modules/workouts/utils/volume-calc';

export default function WorkoutHistoryScreen() {
  const { session } = useSession();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await getWorkoutHistory(session.user.id, 50);
      setSessions(data || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Workout History</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#22c55e" className="mt-10" />
        ) : sessions.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-gray-400">No workouts yet.</Text>
            <Text className="mt-1 text-sm text-gray-500">Complete a workout to see it here.</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const exerciseCount = item.session_exercises?.length || 0;
              const setCount = item.session_exercises?.reduce(
                (sum: number, se: any) => sum + (se.exercise_sets?.length || 0), 0
              ) || 0;
              const date = new Date(item.started_at);
              return (
                <Pressable className="mb-3 rounded-xl bg-gray-800 p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-white">
                      {item.name || 'Workout'}
                    </Text>
                    {item.rating && (
                      <View className="flex-row">
                        {Array.from({ length: item.rating }).map((_, i) => (
                          <Text key={i} className="text-yellow-400">★</Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text className="mt-1 text-sm text-gray-400">
                    {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View className="mt-2 flex-row gap-4">
                    <Text className="text-xs text-gray-500">
                      {item.duration_s ? formatDuration(item.duration_s) : '--:--'}
                    </Text>
                    <Text className="text-xs text-gray-500">{exerciseCount} exercises</Text>
                    <Text className="text-xs text-gray-500">{setCount} sets</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
