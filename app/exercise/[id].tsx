import { Entypo } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ExerciseDetail from '~/src/modules/exercises/components/ExerciseDetail';
import { useExercise } from '~/src/modules/exercises/hooks/useExercises';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: exercise, isLoading, error } = useExercise(id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">Exercise not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-green-400">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Exercise</Text>
          <View style={{ width: 28 }} />
        </View>
        <ExerciseDetail exercise={exercise} />
      </SafeAreaView>
    </View>
  );
}
