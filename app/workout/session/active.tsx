import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SetRow from '~/src/modules/workouts/components/SetRow';
import SessionTimer from '~/src/modules/workouts/components/SessionTimer';
import RestTimer from '~/src/modules/workouts/components/RestTimer';
import ExercisePickerModal from '~/src/modules/workouts/components/ExercisePickerModal';
import { useWorkoutSessionStore } from '~/src/modules/workouts/store/workoutSessionStore';
import { saveCompletedSession } from '~/src/modules/workouts/api/sessions';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { totalVolume, formatDuration } from '~/src/modules/workouts/utils/volume-calc';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ActiveSessionScreen() {
  const { session: authSession } = useSession();
  const store = useWorkoutSessionStore();
  const { activeSession, elapsedSeconds } = store;
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  if (!activeSession) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-lg text-white">No active session</Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-lg bg-green-600 px-6 py-3">
          <Text className="font-bold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const exercises = activeSession.exercises;
  const currentExercise = exercises[currentExerciseIndex];

  const allSets = exercises.flatMap((e) => e.sets);
  const completedCount = allSets.filter((s) => s.completed).length;
  const volume = totalVolume(allSets);

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout?',
      `Duration: ${formatDuration(elapsedSeconds)}\nSets: ${completedCount}/${allSets.length}\nVolume: ${volume.toFixed(0)} kg`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            setSaving(true);
            const finishedSession = store.finishSession();
            if (finishedSession && authSession?.user?.id) {
              try {
                await saveCompletedSession(
                  authSession.user.id,
                  finishedSession,
                  elapsedSeconds
                );
              } catch (err) {
                console.error('Failed to save session, will retry later:', err);
              }
            }
            setSaving(false);
            router.replace('/(home)/workout');
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout?', 'All progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          store.discardSession();
          router.replace('/(home)/workout');
        },
      },
    ]);
  };

  const scrollToExercise = (index: number) => {
    setCurrentExerciseIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable onPress={handleDiscard}>
            <Text className="text-sm font-semibold text-red-400">Discard</Text>
          </Pressable>
          <SessionTimer />
          <Pressable onPress={handleFinish} disabled={saving}>
            <Text className="text-sm font-bold text-green-400">
              {saving ? 'Saving...' : 'Finish'}
            </Text>
          </Pressable>
        </View>

        {/* Stats bar */}
        <View className="flex-row justify-around border-b border-gray-800 py-2">
          <View className="items-center">
            <Text className="text-xs text-gray-500">Sets</Text>
            <Text className="text-sm font-bold text-white">{completedCount}/{allSets.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-gray-500">Volume</Text>
            <Text className="text-sm font-bold text-white">{volume.toFixed(0)} kg</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-gray-500">Exercises</Text>
            <Text className="text-sm font-bold text-white">{currentExerciseIndex + 1}/{exercises.length}</Text>
          </View>
        </View>

        {/* Exercise tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-gray-800">
          <View className="flex-row gap-1 px-2 py-2">
            {exercises.map((ex, i) => {
              const exCompletedSets = ex.sets.filter((s) => s.completed).length;
              const allDone = exCompletedSets === ex.sets.length && ex.sets.length > 0;
              return (
                <Pressable
                  key={ex.id}
                  onPress={() => scrollToExercise(i)}
                  className={`rounded-lg px-3 py-1.5 ${
                    i === currentExerciseIndex
                      ? 'bg-green-700'
                      : allDone
                        ? 'bg-green-900/50'
                        : 'bg-gray-800'
                  }`}>
                  <Text className="text-xs capitalize text-white" numberOfLines={1}>
                    {ex.exerciseName.length > 15
                      ? ex.exerciseName.slice(0, 15) + '...'
                      : ex.exerciseName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Exercise pager */}
        <FlatList
          ref={flatListRef}
          data={exercises}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentExerciseIndex(index);
          }}
          renderItem={({ item: exercise }) => (
            <ScrollView style={{ width: SCREEN_WIDTH }} className="flex-1 px-4 pt-3">
              {/* Exercise name */}
              <Text className="mb-1 text-xl font-bold capitalize text-white">
                {exercise.exerciseName}
              </Text>

              {/* Column headers */}
              <View className="mb-2 flex-row items-center px-3">
                <Text className="w-8 text-center text-xs text-gray-500">Set</Text>
                <Text className="mx-1 flex-1 text-center text-xs text-gray-500">Weight</Text>
                <Text className="mx-1 flex-1 text-center text-xs text-gray-500">Reps</Text>
                <Text className="mx-1 w-14 text-center text-xs text-gray-500">RPE</Text>
                <View style={{ width: 56 }} />
              </View>

              {/* Sets */}
              {exercise.sets.map((set: any) => (
                <SetRow
                  key={set.id}
                  set={set}
                  onUpdate={(data) => store.updateSet(exercise.exerciseId, set.setIndex, data)}
                  onComplete={() => {
                    store.completeSet(exercise.exerciseId, set.setIndex);
                    if (!set.completed) setShowRestTimer(true);
                  }}
                  onRemove={() => store.removeSet(exercise.exerciseId, set.setIndex)}
                />
              ))}

              {/* Add set */}
              <Pressable
                onPress={() => store.addSet(exercise.exerciseId)}
                className="mt-2 flex-row items-center justify-center rounded-lg bg-gray-800 py-3">
                <FontAwesome name="plus" size={14} color="#9ca3af" />
                <Text className="ml-2 text-sm text-gray-400">Add Set</Text>
              </Pressable>

              {/* Rest timer trigger */}
              <Pressable
                onPress={() => setShowRestTimer(true)}
                className="mt-3 flex-row items-center justify-center rounded-lg border border-gray-700 py-3">
                <FontAwesome name="clock-o" size={14} color="#9ca3af" />
                <Text className="ml-2 text-sm text-gray-400">Start Rest Timer</Text>
              </Pressable>

              <View style={{ height: 120 }} />
            </ScrollView>
          )}
        />

        {/* Add exercise floating button */}
        <Pressable
          onPress={() => setShowExercisePicker(true)}
          className="absolute bottom-24 right-4 h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-lg">
          <FontAwesome name="plus" size={20} color="white" />
        </Pressable>

        {/* Rest timer overlay */}
        {showRestTimer && (
          <RestTimer initialSeconds={90} onDismiss={() => setShowRestTimer(false)} />
        )}

        {/* Exercise picker modal */}
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelect={(exercise) => {
            store.addExercise(exercise.id, exercise.name);
            // Scroll to the new exercise
            setTimeout(() => {
              const newIndex = (activeSession?.exercises.length || 1) - 1;
              scrollToExercise(newIndex);
            }, 100);
          }}
        />
      </SafeAreaView>
    </View>
  );
}
