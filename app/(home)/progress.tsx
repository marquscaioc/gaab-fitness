import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Platform, StatusBar, Pressable } from 'react-native';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { getPersonalRecords } from '~/src/modules/analytics/api/personal-records';
import { getWorkoutHistory } from '~/src/modules/workouts/api/sessions';

export default function ProgressScreen() {
  const { session } = useSession();
  const [prs, setPrs] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const [prResult, sessionResult] = await Promise.all([
        getPersonalRecords(session.user.id),
        getWorkoutHistory(session.user.id, 7),
      ]);
      setPrs(prResult.data || []);
      setRecentSessions(sessionResult.data || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const totalWorkouts = recentSessions.length;
  const totalVolume = recentSessions.reduce((sum, s) => {
    const sessionVolume = s.session_exercises?.reduce((eSum: number, se: any) => {
      const setVolume = se.exercise_sets?.reduce((sSum: number, set: any) => {
        return sSum + ((set.weight || 0) * (set.reps || 0));
      }, 0) || 0;
      return eSum + setVolume;
    }, 0) || 0;
    return sum + sessionVolume;
  }, 0);

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView
        className="flex-1"
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View className="border-b-hairline border-gray-300 p-6">
          <Text className="text-2xl font-bold text-green-500">Progress</Text>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Summary cards */}
          <View className="mb-4 flex-row gap-3">
            <View className="flex-1 rounded-xl bg-gray-800 p-4">
              <Text className="text-xs text-gray-400">Recent Workouts</Text>
              <Text className="mt-1 text-2xl font-bold text-white">{totalWorkouts}</Text>
              <Text className="text-xs text-gray-500">last 7 sessions</Text>
            </View>
            <View className="flex-1 rounded-xl bg-gray-800 p-4">
              <Text className="text-xs text-gray-400">Total Volume</Text>
              <Text className="mt-1 text-2xl font-bold text-white">
                {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume.toFixed(0)}kg`}
              </Text>
              <Text className="text-xs text-gray-500">from recent sessions</Text>
            </View>
          </View>

          {/* Personal Records */}
          <View className="mb-4">
            <Text className="mb-3 text-lg font-semibold text-white">Personal Records</Text>
            {prs.length === 0 ? (
              <View className="items-center rounded-xl bg-gray-800 p-6">
                <FontAwesome name="trophy" size={30} color="#4b5563" />
                <Text className="mt-2 text-gray-400">No personal records yet.</Text>
                <Text className="mt-1 text-xs text-gray-500">PRs will be auto-detected when you complete workouts.</Text>
              </View>
            ) : (
              prs.map((pr) => {
                const latestValue = pr.pr_values?.sort(
                  (a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                )[0];
                return (
                  <View key={pr.id} className="mb-2 flex-row items-center justify-between rounded-xl bg-gray-800 p-4">
                    <View>
                      <Text className="text-base font-semibold text-white">{pr.name}</Text>
                      <Text className="text-xs capitalize text-gray-400">{pr.record_type}</Text>
                    </View>
                    <Text className="text-xl font-bold text-green-400">
                      {latestValue ? `${latestValue.value} ${latestValue.unit || ''}` : '--'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Recent sessions */}
          <View className="mb-20">
            <Text className="mb-3 text-lg font-semibold text-white">Recent Sessions</Text>
            {recentSessions.length === 0 ? (
              <View className="items-center rounded-xl bg-gray-800 p-6">
                <FontAwesome name="calendar-o" size={30} color="#4b5563" />
                <Text className="mt-2 text-gray-400">No sessions yet.</Text>
              </View>
            ) : (
              recentSessions.map((s) => (
                <View key={s.id} className="mb-2 rounded-xl bg-gray-800 p-3">
                  <Text className="text-sm font-semibold text-white">{s.name || 'Workout'}</Text>
                  <Text className="text-xs text-gray-400">
                    {new Date(s.started_at).toLocaleDateString()} · {s.session_exercises?.length || 0} exercises
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
