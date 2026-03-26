import { Entypo, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { getTemplates, deleteTemplate } from '~/src/modules/workouts/api/templates';
import { useWorkoutSessionStore } from '~/src/modules/workouts/store/workoutSessionStore';

export default function TemplatesScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const startSession = useWorkoutSessionStore((s) => s.startSession);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await getTemplates(userId);
      setTemplates(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleStart = (template: any) => {
    const exercises = (template.workout_template_exercises || [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((te: any) => ({
        exerciseId: te.exercise_id || te.exercises?.id,
        exerciseName: te.exercises?.name || 'Exercise',
        defaultSets: te.default_sets || 3,
      }));

    startSession({
      name: template.name,
      templateId: template.id,
      exercises,
    });
    router.push('/workout/session/active');
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Template', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(id);
          fetchData();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">My Templates</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#22c55e" className="mt-10" />
        ) : templates.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <FontAwesome name="folder-open-o" size={50} color="#4b5563" />
            <Text className="mt-4 text-lg text-gray-400">No templates yet</Text>
            <Text className="mt-1 text-center text-sm text-gray-500">
              Use the workout builder or create a workout to save templates.
            </Text>
            <Pressable
              onPress={() => router.push('/workout/builder')}
              className="mt-4 rounded-xl bg-green-600 px-6 py-3">
              <Text className="font-bold text-white">Build Workout</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const exerciseCount = item.workout_template_exercises?.length || 0;
              return (
                <View className="mb-3 rounded-xl bg-gray-800 p-4">
                  <Pressable onPress={() => router.push(`/${item.id}`)}>
                    <Text className="text-lg font-bold text-white">{item.name}</Text>
                    {item.category && (
                      <Text className="mt-0.5 text-xs capitalize text-gray-400">{item.category}</Text>
                    )}
                    {item.description && (
                      <Text className="mt-1 text-sm text-gray-400" numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <Text className="mt-2 text-xs text-gray-500">
                      {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      onPress={() => handleStart(item)}
                      className="flex-1 rounded-lg bg-green-600 py-2.5">
                      <Text className="text-center text-sm font-bold text-white">Start Workout</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push(`/edit/${item.id}`)}
                      className="rounded-lg bg-gray-700 px-4 py-2.5">
                      <FontAwesome name="edit" size={16} color="#9ca3af" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(item.id, item.name)}
                      className="rounded-lg bg-gray-700 px-4 py-2.5">
                      <FontAwesome name="trash-o" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
