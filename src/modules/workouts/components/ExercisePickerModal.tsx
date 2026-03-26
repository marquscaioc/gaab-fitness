import { FontAwesome } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchExercises } from '~/src/modules/exercises/api/exercises';

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: { id: string; name: string }) => void;
}

export default function ExercisePickerModal({ visible, onClose, onSelect }: ExercisePickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (timer) clearTimeout(timer);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    const newTimer = setTimeout(async () => {
      setLoading(true);
      const { data } = await searchExercises(text, 30);
      setResults(data || []);
      setLoading(false);
    }, 300);
    setTimer(newTimer);
  }, [timer]);

  const handleSelect = (exercise: any) => {
    onSelect({ id: exercise.id, name: exercise.name });
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-900">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-semibold text-white">Add Exercise</Text>
            <Pressable onPress={onClose}>
              <Text className="text-base text-red-400">Cancel</Text>
            </Pressable>
          </View>

          <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-gray-800 px-4 py-3">
            <FontAwesome name="search" size={16} color="#9ca3af" />
            <TextInput
              value={query}
              onChangeText={handleSearch}
              placeholder="Search exercises..."
              placeholderTextColor="#6b7280"
              className="ml-3 flex-1 text-base text-white"
              autoCapitalize="none"
              autoFocus
            />
            {loading && <ActivityIndicator size="small" color="#22c55e" />}
          </View>

          {query.length < 2 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Type at least 2 characters to search</Text>
            </View>
          ) : results.length === 0 && !loading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">No exercises found</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  className="mb-2 flex-row items-center rounded-xl bg-gray-800 p-4">
                  <View className="flex-1">
                    <Text className="text-base capitalize text-white">{item.name}</Text>
                    <View className="mt-1 flex-row gap-1">
                      {(item.target_muscles || []).map((m: string) => (
                        <Text key={m} className="text-xs capitalize text-green-400">{m}</Text>
                      ))}
                      <Text className="text-xs text-gray-500">·</Text>
                      {(item.equipment || []).map((e: string) => (
                        <Text key={e} className="text-xs capitalize text-blue-400">{e}</Text>
                      ))}
                    </View>
                  </View>
                  <FontAwesome name="plus-circle" size={24} color="#22c55e" />
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
