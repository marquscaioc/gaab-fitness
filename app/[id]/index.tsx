import { Entypo } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '~/src/shared/lib/supabase';

export default function WorkoutDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('workout_templates')
        .select('*, workout_template_exercises(*, exercises(*))')
        .eq('id', id)
        .single();
      setTemplate(data);
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

  if (!template) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-center text-white">Workout not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-green-400">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const exercises = template.workout_template_exercises || [];

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1 p-4">
        <ScrollView showsVerticalScrollIndicator={false}>
          <Pressable
            className="absolute right-1 top-1 z-10"
            onPress={() => router.back()}>
            <Entypo name="cross" size={25} color="white" />
          </Pressable>

          <Text className="border-b border-gray-700 pb-3 text-2xl font-bold text-green-400">
            {template.name}
          </Text>
          {template.category && (
            <Text className="mt-1 text-lg font-semibold text-gray-300">{template.category}</Text>
          )}

          {template.description && (
            <View className="mt-4 rounded-lg bg-gray-800 p-4">
              <Text className="text-gray-300">{template.description}</Text>
            </View>
          )}

          <View className="mt-6">
            <Text className="text-xl font-semibold text-green-400">
              Exercises ({exercises.length})
            </Text>
            {exercises
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((te: any) => (
                <Pressable
                  key={te.id}
                  onPress={() => te.exercises?.id && router.push(`/exercise/${te.exercises.id}`)}
                  className="mt-3 rounded-lg bg-gray-800 p-4">
                  <Text className="text-lg font-semibold capitalize text-white">
                    {te.exercises?.name || 'Unknown exercise'}
                  </Text>
                  <View className="mt-2 flex-row gap-4">
                    <Text className="text-sm text-green-400">
                      {te.default_sets || 3} sets x {te.default_reps || 10} reps
                    </Text>
                    <Text className="text-sm text-gray-400">
                      Rest: {te.rest_seconds || 90}s
                    </Text>
                  </View>
                  {te.notes && (
                    <Text className="mt-1 text-sm text-gray-500">{te.notes}</Text>
                  )}
                </Pressable>
              ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
