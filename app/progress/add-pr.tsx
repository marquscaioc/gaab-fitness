import { Entypo } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { createPR } from '~/src/modules/analytics/api/personal-records';
import { useQueryClient } from '@tanstack/react-query';

const RECORD_TYPES = [
  { id: 'weight', label: 'Weight', placeholder: '100', unit: 'kg' },
  { id: 'reps', label: 'Reps', placeholder: '12', unit: 'reps' },
  { id: 'time', label: 'Time', placeholder: '120', unit: 'sec' },
  { id: 'distance', label: 'Distance', placeholder: '5.0', unit: 'km' },
] as const;

export default function AddPRScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('weight');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedType = RECORD_TYPES.find((t) => t.id === type)!;

  const handleSave = async () => {
    if (!session?.user?.id || !name.trim()) {
      Alert.alert('Error', 'Please enter a name for the PR.');
      return;
    }
    setSaving(true);
    try {
      await createPR(session.user.id, {
        name: name.trim(),
        recordType: type as any,
        initialValue: value ? parseFloat(value) : undefined,
        unit: selectedType.unit,
      });
      queryClient.invalidateQueries({ queryKey: ['prs'] });
      Alert.alert('Saved', 'Personal record created.');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save PR.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">New Personal Record</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <Text className="mb-2 text-sm text-gray-400">PR Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bench Press 1RM"
            placeholderTextColor="#6b7280"
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
          />

          <Text className="mb-2 text-sm text-gray-400">Record Type</Text>
          <View className="mb-4 flex-row gap-2">
            {RECORD_TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setType(t.id)}
                className={`flex-1 rounded-xl py-3 ${type === t.id ? 'bg-green-600' : 'bg-gray-800'}`}>
                <Text className="text-center text-sm text-white">{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-2 text-sm text-gray-400">
            Current Value ({selectedType.unit}) — optional
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={selectedType.placeholder}
            placeholderTextColor="#6b7280"
            keyboardType="decimal-pad"
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
          />
        </ScrollView>

        <View className="px-4 pb-6">
          <Pressable
            onPress={handleSave}
            disabled={saving || !name.trim()}
            className={`rounded-xl py-4 ${name.trim() ? 'bg-green-600' : 'bg-gray-700'}`}>
            <Text className="text-center text-base font-bold text-white">
              {saving ? 'Saving...' : 'Create PR'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
