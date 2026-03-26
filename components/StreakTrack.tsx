import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { supabase } from '~/src/shared/lib/supabase';

export default function StreakTrack() {
  const { session, profile } = useSession();
  const [markedDates, setMarkedDates] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  const longestStreak = profile?.longest_streak || 0;
  const currentStreak = profile?.streak_count || 0;

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return;
      fetchWorkoutDays();
    }, [session?.user?.id])
  );

  const fetchWorkoutDays = async () => {
    setLoading(true);
    try {
      // Fetch all session dates for this month and surrounding months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data } = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('user_id', session!.user.id)
        .gte('started_at', threeMonthsAgo.toISOString())
        .order('started_at', { ascending: true });

      const dates: { [key: string]: boolean } = {};
      for (const row of data || []) {
        const dateStr = row.started_at.split('T')[0];
        dates[dateStr] = true;
      }
      setMarkedDates(dates);
    } catch (error) {
      console.error('Error loading workout days:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="items-center p-8">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View className="gap-2 p-4">
      <Text className="mb-2 text-center text-xl font-bold text-white">
        Current Streak: {currentStreak} days
      </Text>
      <Text className="mb-2 text-center text-base text-gray-400">
        Longest Streak: {longestStreak} days
      </Text>
      <Calendar
        markingType="custom"
        theme={{
          backgroundColor: '#1F2937',
          calendarBackground: '#1F2937',
          textSectionTitleColor: '#e5e7eb',
          dayTextColor: '#ffffff',
          todayTextColor: '#facc15',
          monthTextColor: '#e5e7eb',
          arrowColor: '#e5e7eb',
          textDisabledColor: '#6b7280',
        }}
        dayComponent={({ date, state }: { date?: any; state?: any }) => (
          <View style={{ alignItems: 'center', justifyContent: 'center', height: 30, width: 30 }}>
            {markedDates[date?.dateString] ? (
              <View className="h-7 w-7 items-center justify-center rounded-full bg-green-600">
                <Text style={{ fontSize: 12, color: 'white', fontWeight: 'bold' }}>
                  {date?.day}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color:
                    date?.dateString === new Date().toISOString().split('T')[0]
                      ? '#facc15'
                      : state === 'disabled'
                        ? '#6b7280'
                        : '#ffffff',
                  fontWeight: 'bold',
                  fontSize: 16,
                }}>
                {date?.day}
              </Text>
            )}
          </View>
        )}
      />
      <Text className="text-center text-xs text-gray-500">
        Green circles = workout days. Streak updates automatically when you finish workouts.
      </Text>
    </View>
  );
}
