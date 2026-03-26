import { FontAwesome } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';

interface ExerciseSearchProps {
  onChangeText: (text: string) => void;
  isLoading?: boolean;
}

export default function ExerciseSearch({ onChangeText, isLoading }: ExerciseSearchProps) {
  const [value, setValue] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      if (timer) clearTimeout(timer);
      const newTimer = setTimeout(() => {
        onChangeText(text);
      }, 300);
      setTimer(newTimer);
    },
    [onChangeText, timer]
  );

  return (
    <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-gray-800 px-4 py-3">
      <FontAwesome name="search" size={16} color="#9ca3af" />
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder="Search exercises..."
        placeholderTextColor="#6b7280"
        className="ml-3 flex-1 text-base text-white"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isLoading && <ActivityIndicator size="small" color="#22c55e" />}
    </View>
  );
}
