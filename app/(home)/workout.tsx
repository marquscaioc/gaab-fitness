import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { View, Text, Pressable, SafeAreaView, Platform, StatusBar, ScrollView } from 'react-native';

import ExerciseCard from '~/src/modules/exercises/components/ExerciseCard';
import ExerciseSearch from '~/src/modules/exercises/components/ExerciseSearch';
import ProgramCard from '~/src/modules/programs/components/ProgramCard';
import { useExerciseSearch } from '~/src/modules/exercises/hooks/useExercises';
import { usePublishedPrograms } from '~/src/modules/programs/hooks/usePrograms';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useWorkoutSessionStore } from '~/src/modules/workouts/store/workoutSessionStore';

type Tab = 'start' | 'exercises' | 'programs';

export default function WorkoutTab() {
  const { session } = useSession();
  const activeSession = useWorkoutSessionStore((s) => s.activeSession);
  const startSession = useWorkoutSessionStore((s) => s.startSession);
  const [tab, setTab] = useState<Tab>('start');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading: searchLoading } = useExerciseSearch(searchQuery);
  const { data: programs } = usePublishedPrograms();

  const handleQuickStart = () => {
    startSession({
      name: 'Quick Workout',
      exercises: [],
    });
    router.push('/workout/session/active');
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView
        className="flex-1"
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View className="border-b-hairline border-gray-300 p-6">
          <Text className="text-2xl font-bold text-green-500">Workouts</Text>
        </View>

        {/* Resume banner */}
        {activeSession && (
          <Pressable
            onPress={() => router.push('/workout/session/active')}
            className="mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-green-800 px-4 py-3">
            <View>
              <Text className="text-sm font-bold text-white">Workout in progress</Text>
              <Text className="text-xs text-green-300">{activeSession.name}</Text>
            </View>
            <Text className="text-sm font-bold text-green-300">Resume</Text>
          </Pressable>
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-gray-800">
          <View className="flex-row gap-2 px-4 py-3">
            {(['start', 'exercises', 'programs'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`rounded-lg px-5 py-2 ${tab === t ? 'bg-green-600' : 'bg-gray-700'}`}>
                <Text className="text-sm font-semibold capitalize text-white">{t}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {tab === 'start' && (
          <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
            <Pressable
              onPress={handleQuickStart}
              className="mb-3 flex-row items-center rounded-xl bg-green-700 p-4">
              <FontAwesome6 name="bolt-lightning" size={20} color="white" />
              <View className="ml-4">
                <Text className="text-base font-bold text-white">Quick Start</Text>
                <Text className="text-sm text-green-200">Start empty, add exercises as you go</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/workout/builder')}
              className="mb-3 flex-row items-center rounded-xl bg-blue-800 p-4">
              <FontAwesome name="magic" size={20} color="white" />
              <View className="ml-4">
                <Text className="text-base font-bold text-white">Build Workout</Text>
                <Text className="text-sm text-blue-200">Pick equipment + muscles, get exercises</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/workout/templates')}
              className="mb-3 flex-row items-center rounded-xl bg-purple-900 p-4">
              <FontAwesome name="bookmark" size={20} color="white" />
              <View className="ml-4">
                <Text className="text-base font-bold text-white">My Templates</Text>
                <Text className="text-sm text-purple-300">Saved workouts, tap to start</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/workout/history')}
              className="mb-3 flex-row items-center rounded-xl bg-gray-800 p-4">
              <FontAwesome name="history" size={20} color="white" />
              <View className="ml-4">
                <Text className="text-base font-bold text-white">History</Text>
                <Text className="text-sm text-gray-400">View past workout sessions</Text>
              </View>
            </Pressable>

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {tab === 'exercises' && (
          <View className="flex-1">
            <ExerciseSearch onChangeText={setSearchQuery} isLoading={searchLoading} />
            {searchQuery.length >= 2 ? (
              <View className="flex-1 px-4">
                {searchResults && searchResults.length > 0 ? (
                  <FlashList
                    data={searchResults}
                    estimatedItemSize={80}
                    keyExtractor={(item: any) => item.id}
                    renderItem={({ item }: { item: any }) => <ExerciseCard exercise={item} />}
                  />
                ) : (
                  <Text className="mt-4 text-center text-gray-400">
                    {searchLoading ? 'Searching...' : 'No exercises found'}
                  </Text>
                )}
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-4">
                <FontAwesome name="search" size={40} color="#4b5563" />
                <Text className="mt-3 text-center text-gray-500">
                  Search from 1,500+ exercises
                </Text>
              </View>
            )}
          </View>
        )}

        {tab === 'programs' && (
          <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
            {!programs || programs.length === 0 ? (
              <View className="items-center justify-center py-10">
                <FontAwesome name="book" size={40} color="#4b5563" />
                <Text className="mt-3 text-center text-gray-400">
                  No programs available yet.
                </Text>
                <Text className="mt-1 text-center text-xs text-gray-500">
                  Programs will appear here once created.
                </Text>
              </View>
            ) : (
              programs.map((program: any) => (
                <ProgramCard key={program.id} program={program} />
              ))
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
