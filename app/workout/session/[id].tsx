import { Entypo, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSessionById } from '~/src/modules/workouts/api/sessions';
import { formatDuration, totalVolume } from '~/src/modules/workouts/utils/volume-calc';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await getSessionById(id);
        setSession(data);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-white">Session not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-green-400">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sessionExercises = session.session_exercises || [];
  const allSets = sessionExercises.flatMap((se: any) => se.exercise_sets || []);
  const vol = totalVolume(allSets);
  const date = new Date(session.started_at);

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Session Detail</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text className="text-2xl font-bold text-white">{session.name || 'Workout'}</Text>
          <Text className="mt-1 text-sm text-gray-400">
            {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {/* Rating */}
          {session.rating && (
            <View className="mt-2 flex-row">
              {Array.from({ length: 5 }).map((_, i) => (
                <FontAwesome
                  key={i}
                  name={i < session.rating ? 'star' : 'star-o'}
                  size={18}
                  color={i < session.rating ? '#facc15' : '#4b5563'}
                />
              ))}
            </View>
          )}

          {/* Stats */}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Duration</Text>
              <Text className="text-lg font-bold text-white">
                {session.duration_s ? formatDuration(session.duration_s) : '--'}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Volume</Text>
              <Text className="text-lg font-bold text-white">{vol.toFixed(0)} kg</Text>
            </View>
            <View className="flex-1 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Sets</Text>
              <Text className="text-lg font-bold text-white">{allSets.length}</Text>
            </View>
          </View>

          {/* Notes */}
          {session.notes && (
            <View className="mt-4 rounded-xl bg-gray-800 p-4">
              <Text className="text-xs text-gray-500">Notes</Text>
              <Text className="mt-1 text-base text-gray-300">{session.notes}</Text>
            </View>
          )}

          {/* Exercises */}
          <Text className="mb-3 mt-6 text-lg font-semibold text-white">Exercises</Text>
          {sessionExercises
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((se: any) => {
              const sets = se.exercise_sets || [];
              return (
                <View key={se.id} className="mb-3 rounded-xl bg-gray-800 p-4">
                  <Pressable onPress={() => se.exercise_id && router.push(`/exercise/${se.exercise_id}`)}>
                    <Text className="text-base font-semibold capitalize text-white">
                      {se.exercises?.name || 'Exercise'}
                    </Text>
                  </Pressable>

                  {/* Set headers */}
                  {sets.length > 0 && (
                    <View className="mt-3">
                      <View className="mb-1 flex-row">
                        <Text className="w-10 text-center text-xs text-gray-500">Set</Text>
                        <Text className="flex-1 text-center text-xs text-gray-500">Weight</Text>
                        <Text className="flex-1 text-center text-xs text-gray-500">Reps</Text>
                        <Text className="w-12 text-center text-xs text-gray-500">RPE</Text>
                      </View>
                      {sets
                        .sort((a: any, b: any) => a.set_index - b.set_index)
                        .map((set: any) => (
                          <View key={set.id} className="flex-row items-center rounded-lg bg-gray-700/50 py-2">
                            <Text className="w-10 text-center text-sm text-gray-400">
                              {set.set_index + 1}
                            </Text>
                            <Text className="flex-1 text-center text-sm text-white">
                              {set.weight ? `${set.weight} ${set.weight_unit || 'kg'}` : '-'}
                            </Text>
                            <Text className="flex-1 text-center text-sm text-white">
                              {set.reps || '-'}
                            </Text>
                            <Text className="w-12 text-center text-sm text-gray-400">
                              {set.rpe || '-'}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              );
            })}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
