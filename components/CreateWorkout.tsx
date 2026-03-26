import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { createTemplate } from '~/src/modules/workouts/api/templates';
import { searchExercises } from '~/src/modules/exercises/api/exercises';

export default function CreateWorkout({
  onClose,
  userId,
}: {
  onClose: () => void;
  userId: string;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<
    { id: string; name: string; defaultSets: number; defaultReps: number }[]
  >([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    const { data } = await searchExercises(searchQuery, 10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const addExercise = (exercise: any) => {
    if (selectedExercises.find((e) => e.id === exercise.id)) return;
    setSelectedExercises([
      ...selectedExercises,
      { id: exercise.id, name: exercise.name, defaultSets: 3, defaultReps: 10 },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const handleSaveWorkout = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a workout name.');
      return;
    }

    try {
      await createTemplate(
        userId,
        { name: name.trim(), description, category },
        selectedExercises.map((ex, i) => ({
          exerciseId: ex.id,
          sortOrder: i,
          defaultSets: ex.defaultSets,
          defaultReps: ex.defaultReps,
          restSeconds: 90,
        }))
      );
      Alert.alert('Saved', 'Workout template created.');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save workout.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <Text className="border-b border-gray-700 p-4 text-2xl font-bold text-green-500">
          Create Workout
        </Text>

        <ScrollView className="px-4 py-2" showsVerticalScrollIndicator={false}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Workout Name"
            placeholderTextColor="#6b7280"
            className="mb-3 rounded-xl bg-gray-800 p-4 text-white"
          />
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Category (e.g. push, pull, legs)"
            placeholderTextColor="#6b7280"
            className="mb-3 rounded-xl bg-gray-800 p-4 text-white"
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#6b7280"
            multiline
            className="mb-4 rounded-xl bg-gray-800 p-4 text-white"
            style={{ minHeight: 60 }}
          />

          {/* Exercise search */}
          <Text className="mb-2 text-base font-semibold text-white">Add Exercises</Text>
          <View className="mb-3 flex-row gap-2">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor="#6b7280"
              className="flex-1 rounded-xl bg-gray-800 px-4 py-3 text-white"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              onPress={handleSearch}
              className="items-center justify-center rounded-xl bg-green-700 px-4">
              <Text className="font-bold text-white">Search</Text>
            </TouchableOpacity>
          </View>

          {/* Search results */}
          {searchResults.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              onPress={() => addExercise(exercise)}
              className="mb-2 flex-row items-center justify-between rounded-lg bg-gray-800 p-3">
              <Text className="flex-1 capitalize text-white">{exercise.name}</Text>
              <Text className="text-green-400">+ Add</Text>
            </TouchableOpacity>
          ))}

          {/* Selected exercises */}
          {selectedExercises.length > 0 && (
            <View className="mt-4">
              <Text className="mb-2 text-base font-semibold text-white">
                Exercises ({selectedExercises.length})
              </Text>
              {selectedExercises.map((exercise, index) => (
                <View
                  key={exercise.id}
                  className="mb-2 flex-row items-center justify-between rounded-lg bg-gray-800 p-3">
                  <Text className="flex-1 capitalize text-white">{exercise.name}</Text>
                  <Text className="mr-3 text-sm text-gray-400">
                    {exercise.defaultSets}x{exercise.defaultReps}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeExercise(index)}
                    className="rounded-lg bg-red-800 px-2 py-1">
                    <Text className="text-xs text-white">X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View className="mt-6 gap-3 pb-10">
            <TouchableOpacity
              onPress={handleSaveWorkout}
              className="rounded-xl bg-green-600 p-4">
              <Text className="text-center font-bold text-white">Save Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="rounded-xl bg-gray-700 p-4">
              <Text className="text-center font-bold text-white">Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
