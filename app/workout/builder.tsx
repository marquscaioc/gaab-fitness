import { Entypo } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ExerciseCard from '~/src/modules/exercises/components/ExerciseCard';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { createTemplate } from '~/src/modules/workouts/api/templates';
import { generateWorkout } from '~/src/modules/workouts/utils/workout-generator';
import { useWorkoutSessionStore } from '~/src/modules/workouts/store/workoutSessionStore';
import { EQUIPMENT } from '~/src/shared/constants/equipment';
import { PRIMARY_MUSCLES } from '~/src/shared/constants/muscles';

type Step = 'equipment' | 'muscles' | 'results';

export default function WorkoutBuilderScreen() {
  const { session } = useSession();
  const startSession = useWorkoutSessionStore((s) => s.startSession);

  const [step, setStep] = useState<Step>('equipment');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [generatedExercises, setGeneratedExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleGenerate = async () => {
    if (selectedMuscles.length === 0) {
      Alert.alert('Select Muscles', 'Please select at least one target muscle.');
      return;
    }
    setLoading(true);
    try {
      const exercises = await generateWorkout({
        targetMuscles: selectedMuscles,
        equipment: selectedEquipment.length > 0 ? selectedEquipment : [...EQUIPMENT],
        exercisesPerMuscle: 3,
      });
      setGeneratedExercises(exercises);
      setStep('results');
    } catch (err) {
      Alert.alert('Error', 'Failed to generate workout. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = () => {
    startSession({
      name: `${selectedMuscles.join(' + ')} Workout`,
      exercises: generatedExercises.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        defaultSets: 3,
      })),
    });
    router.replace('/workout/session/active');
  };

  const handleSaveTemplate = async () => {
    if (!session?.user?.id) return;
    try {
      await createTemplate(
        session.user.id,
        {
          name: `${selectedMuscles.join(' + ')} Workout`,
          category: selectedMuscles.length === 1 ? selectedMuscles[0] : 'custom',
        },
        generatedExercises.map((ex, i) => ({
          exerciseId: ex.id,
          sortOrder: i,
          defaultSets: 3,
          defaultReps: 10,
          restSeconds: 90,
        }))
      );
      Alert.alert('Saved', 'Workout template saved successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save template.');
    }
  };

  const removeExercise = (id: string) => {
    setGeneratedExercises((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => (step === 'equipment' ? router.back() : setStep(step === 'results' ? 'muscles' : 'equipment'))}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">
            {step === 'equipment' ? 'Step 1: Equipment' : step === 'muscles' ? 'Step 2: Muscles' : 'Your Workout'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Progress */}
        <View className="flex-row gap-2 px-4 pb-3">
          {['equipment', 'muscles', 'results'].map((s, i) => (
            <View
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= ['equipment', 'muscles', 'results'].indexOf(step) ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </View>

        {/* Step 1: Equipment */}
        {step === 'equipment' && (
          <ScrollView className="flex-1 px-4">
            <Text className="mb-3 text-gray-400">Select equipment you have access to (skip to use all):</Text>
            <View className="flex-row flex-wrap gap-2">
              {EQUIPMENT.map((item) => {
                const isSelected = selectedEquipment.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggleItem(item, selectedEquipment, setSelectedEquipment)}
                    className={`rounded-xl px-4 py-2.5 ${isSelected ? 'bg-blue-600' : 'bg-gray-800'}`}>
                    <Text className={`text-sm capitalize ${isSelected ? 'font-bold text-white' : 'text-gray-400'}`}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setStep('muscles')}
              className="mt-6 rounded-xl bg-green-600 py-4">
              <Text className="text-center text-base font-bold text-white">
                Next: Select Muscles
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Step 2: Muscles */}
        {step === 'muscles' && (
          <ScrollView className="flex-1 px-4">
            <Text className="mb-3 text-gray-400">Select target muscle groups:</Text>
            <View className="flex-row flex-wrap gap-2">
              {PRIMARY_MUSCLES.map((item) => {
                const isSelected = selectedMuscles.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggleItem(item, selectedMuscles, setSelectedMuscles)}
                    className={`rounded-xl px-4 py-2.5 ${isSelected ? 'bg-green-600' : 'bg-gray-800'}`}>
                    <Text className={`text-sm capitalize ${isSelected ? 'font-bold text-white' : 'text-gray-400'}`}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#22c55e" className="mt-8" />
            ) : (
              <Pressable
                onPress={handleGenerate}
                className={`mt-6 rounded-xl py-4 ${selectedMuscles.length > 0 ? 'bg-green-600' : 'bg-gray-700'}`}
                disabled={selectedMuscles.length === 0}>
                <Text className="text-center text-base font-bold text-white">
                  Generate Workout ({selectedMuscles.length} muscle{selectedMuscles.length !== 1 ? 's' : ''})
                </Text>
              </Pressable>
            )}
          </ScrollView>
        )}

        {/* Step 3: Results */}
        {step === 'results' && (
          <View className="flex-1">
            <ScrollView className="flex-1 px-4">
              <Text className="mb-3 text-gray-400">
                {generatedExercises.length} exercises generated. Swipe to remove, or start.
              </Text>
              {generatedExercises.map((exercise) => (
                <View key={exercise.id} className="flex-row items-center">
                  <View className="flex-1">
                    <ExerciseCard exercise={exercise} onPress={() => router.push(`/exercise/${exercise.id}`)} />
                  </View>
                  <Pressable onPress={() => removeExercise(exercise.id)} className="ml-2 p-2">
                    <Entypo name="cross" size={22} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <View className="flex-row gap-3 px-4 pb-6 pt-3">
              <Pressable onPress={handleSaveTemplate} className="flex-1 rounded-xl bg-gray-700 py-4">
                <Text className="text-center text-sm font-bold text-white">Save Template</Text>
              </Pressable>
              <Pressable onPress={handleStartWorkout} className="flex-1 rounded-xl bg-green-600 py-4">
                <Text className="text-center text-sm font-bold text-white">Start Workout</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
