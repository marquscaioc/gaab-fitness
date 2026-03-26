import { FontAwesome } from '@expo/vector-icons';
import { View, Text, TextInput, Pressable } from 'react-native';

import type { WorkoutSet } from '../store/workoutSessionStore';

interface SetRowProps {
  set: WorkoutSet;
  onUpdate: (data: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onRemove: () => void;
}

export default function SetRow({ set, onUpdate, onComplete, onRemove }: SetRowProps) {
  return (
    <View className={`mb-2 flex-row items-center rounded-lg px-3 py-2 ${set.completed ? 'bg-green-900/40' : 'bg-gray-800'}`}>
      {/* Set number */}
      <Text className="w-8 text-center text-sm font-bold text-gray-400">{set.setIndex + 1}</Text>

      {/* Weight */}
      <View className="mx-1 flex-1">
        <TextInput
          value={set.weight?.toString() || ''}
          onChangeText={(t) => onUpdate({ weight: t ? parseFloat(t) : null })}
          placeholder="0"
          placeholderTextColor="#6b7280"
          keyboardType="decimal-pad"
          className="rounded-lg bg-gray-700 px-3 py-2 text-center text-sm text-white"
        />
        <Text className="mt-0.5 text-center text-xs text-gray-500">{set.weightUnit}</Text>
      </View>

      {/* Reps */}
      <View className="mx-1 flex-1">
        <TextInput
          value={set.reps?.toString() || ''}
          onChangeText={(t) => onUpdate({ reps: t ? parseInt(t, 10) : null })}
          placeholder="0"
          placeholderTextColor="#6b7280"
          keyboardType="number-pad"
          className="rounded-lg bg-gray-700 px-3 py-2 text-center text-sm text-white"
        />
        <Text className="mt-0.5 text-center text-xs text-gray-500">reps</Text>
      </View>

      {/* RPE */}
      <View className="mx-1 w-14">
        <TextInput
          value={set.rpe?.toString() || ''}
          onChangeText={(t) => {
            const val = t ? parseInt(t, 10) : null;
            if (val === null || (val >= 1 && val <= 10)) onUpdate({ rpe: val });
          }}
          placeholder="-"
          placeholderTextColor="#6b7280"
          keyboardType="number-pad"
          maxLength={2}
          className="rounded-lg bg-gray-700 px-2 py-2 text-center text-sm text-white"
        />
        <Text className="mt-0.5 text-center text-xs text-gray-500">RPE</Text>
      </View>

      {/* Complete toggle */}
      <Pressable onPress={onComplete} className="ml-2 p-2">
        <FontAwesome
          name={set.completed ? 'check-circle' : 'circle-o'}
          size={24}
          color={set.completed ? '#22c55e' : '#6b7280'}
        />
      </Pressable>

      {/* Remove */}
      <Pressable onPress={onRemove} className="p-1">
        <FontAwesome name="trash-o" size={16} color="#6b7280" />
      </Pressable>
    </View>
  );
}
