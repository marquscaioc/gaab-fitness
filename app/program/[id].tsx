import { Entypo, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useProgram } from '~/src/modules/programs/hooks/usePrograms';
import { enrollInProgram } from '~/src/modules/programs/api/programs';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { data: program, isLoading } = useProgram(id);

  const handleEnroll = async () => {
    if (!session?.user?.id || !id) return;
    try {
      await enrollInProgram(session.user.id, id);
      Alert.alert('Enrolled', 'You have been enrolled in this program.');
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        Alert.alert('Already Enrolled', 'You are already in this program.');
      } else {
        Alert.alert('Error', 'Failed to enroll.');
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!program) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-white">Program not found</Text>
      </SafeAreaView>
    );
  }

  const weeks = (program as any).program_weeks || [];

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Program</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <Text className="text-2xl font-bold text-white">{program.name}</Text>
          {program.description && (
            <Text className="mt-2 text-base text-gray-400">{program.description}</Text>
          )}

          <View className="mt-4 flex-row flex-wrap gap-2">
            {program.level && (
              <View className="rounded-full bg-green-900 px-3 py-1">
                <Text className="text-xs capitalize text-green-400">{program.level}</Text>
              </View>
            )}
            {program.duration_weeks && (
              <View className="rounded-full bg-gray-700 px-3 py-1">
                <Text className="text-xs text-gray-300">{program.duration_weeks} weeks</Text>
              </View>
            )}
            {program.sessions_per_week && (
              <View className="rounded-full bg-gray-700 px-3 py-1">
                <Text className="text-xs text-gray-300">{program.sessions_per_week}x per week</Text>
              </View>
            )}
          </View>

          {/* Weeks */}
          <Text className="mb-3 mt-6 text-lg font-semibold text-white">Schedule</Text>
          {weeks.length === 0 ? (
            <Text className="text-gray-500">No weeks defined yet.</Text>
          ) : (
            weeks
              .sort((a: any, b: any) => a.week_number - b.week_number)
              .map((week: any) => (
                <View key={week.id} className="mb-3 rounded-xl bg-gray-800 p-4">
                  <Text className="text-base font-semibold text-white">
                    Week {week.week_number}{week.name ? `: ${week.name}` : ''}
                  </Text>
                  {week.description && (
                    <Text className="mt-1 text-sm text-gray-400">{week.description}</Text>
                  )}
                  {week.program_sessions?.length > 0 && (
                    <View className="mt-2">
                      {week.program_sessions
                        .sort((a: any, b: any) => a.session_number - b.session_number)
                        .map((ps: any) => (
                          <View key={ps.id} className="mt-1 flex-row items-center">
                            <FontAwesome name="circle-o" size={10} color="#6b7280" />
                            <Text className="ml-2 text-sm text-gray-300">
                              Session {ps.session_number}{ps.name ? `: ${ps.name}` : ''}
                              {ps.estimated_min ? ` (${ps.estimated_min} min)` : ''}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Enroll button */}
        <View className="px-4 pb-6">
          <Pressable onPress={handleEnroll} className="rounded-xl bg-green-600 py-4">
            <Text className="text-center text-base font-bold text-white">Enroll in Program</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
