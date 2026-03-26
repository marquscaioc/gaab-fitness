import { FontAwesome } from '@expo/vector-icons';
import { View, Text, Pressable } from 'react-native';

import SetRow from './SetRow';
import type { SessionExercise, WorkoutSet } from '../store/workoutSessionStore';
import { useWorkoutSessionStore } from '../store/workoutSessionStore';

interface ExerciseSetListProps {
  exercise: SessionExercise;
  onSetCompleted?: () => void;
}

export default function ExerciseSetList({ exercise, onSetCompleted }: ExerciseSetListProps) {
  const { updateSet, completeSet, addSet, removeSet } = useWorkoutSessionStore();

  return (
    <View className="mb-4">
      <Text className="mb-2 text-lg font-bold capitalize text-white">{exercise.exerciseName}</Text>

      {/* Column headers */}
      <View className="mb-1 flex-row items-center px-3">
        <Text className="w-8 text-center text-xs text-gray-500">Set</Text>
        <Text className="mx-1 flex-1 text-center text-xs text-gray-500">Weight</Text>
        <Text className="mx-1 flex-1 text-center text-xs text-gray-500">Reps</Text>
        <Text className="mx-1 w-14 text-center text-xs text-gray-500">RPE</Text>
        <View style={{ width: 56 }} />
      </View>

      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          onUpdate={(data) => updateSet(exercise.exerciseId, set.setIndex, data)}
          onComplete={() => {
            completeSet(exercise.exerciseId, set.setIndex);
            if (!set.completed && onSetCompleted) onSetCompleted();
          }}
          onRemove={() => removeSet(exercise.exerciseId, set.setIndex)}
        />
      ))}

      <Pressable
        onPress={() => addSet(exercise.exerciseId)}
        className="mt-1 flex-row items-center justify-center rounded-lg bg-gray-800 py-2">
        <FontAwesome name="plus" size={12} color="#9ca3af" />
        <Text className="ml-2 text-xs text-gray-400">Add Set</Text>
      </Pressable>
    </View>
  );
}
