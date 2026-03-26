import { Entypo } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { createChallenge } from '~/src/modules/social/api/challenges';

const CHALLENGE_TYPES = [
  { id: 'frequency', label: 'Workout Frequency', desc: 'Most workouts completed', unit: 'workouts' },
  { id: 'volume', label: 'Total Volume', desc: 'Most weight lifted (kg)', unit: 'kg' },
  { id: 'streak', label: 'Longest Streak', desc: 'Most consecutive days', unit: 'days' },
  { id: 'distance', label: 'Distance', desc: 'Most distance covered', unit: 'km' },
] as const;

const DURATIONS = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
];

export default function CreateChallengeScreen() {
  const { session } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('frequency');
  const [targetValue, setTargetValue] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const selectedType = CHALLENGE_TYPES.find((t) => t.id === type);

  const handleCreate = async () => {
    if (!session?.user?.id || !name.trim()) {
      Alert.alert('Error', 'Please enter a challenge name.');
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + durationDays * 86400000).toISOString();

      await createChallenge(session.user.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        challengeType: type as any,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        targetUnit: selectedType?.unit,
        startsAt,
        endsAt,
      });

      Alert.alert('Created', 'Challenge created! Share it with friends.');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to create challenge.');
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
          <Text className="text-lg font-semibold text-white">New Challenge</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <Text className="mb-2 text-sm text-gray-400">Challenge Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. March Madness"
            placeholderTextColor="#6b7280"
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
          />

          <Text className="mb-2 text-sm text-gray-400">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's this challenge about?"
            placeholderTextColor="#6b7280"
            multiline
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
            style={{ minHeight: 80 }}
          />

          <Text className="mb-2 text-sm text-gray-400">Challenge Type</Text>
          <View className="mb-4 gap-2">
            {CHALLENGE_TYPES.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setType(t.id)}
                className={`rounded-xl p-4 ${type === t.id ? 'bg-green-800 border border-green-500' : 'bg-gray-800'}`}>
                <Text className="text-base font-semibold text-white">{t.label}</Text>
                <Text className="mt-0.5 text-xs text-gray-400">{t.desc}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-2 text-sm text-gray-400">Target (optional)</Text>
          <TextInput
            value={targetValue}
            onChangeText={setTargetValue}
            placeholder={`e.g. 20 ${selectedType?.unit || ''}`}
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
          />

          <Text className="mb-2 text-sm text-gray-400">Duration</Text>
          <View className="mb-6 flex-row gap-3">
            {DURATIONS.map((d) => (
              <Pressable
                key={d.days}
                onPress={() => setDurationDays(d.days)}
                className={`flex-1 rounded-xl py-3 ${durationDays === d.days ? 'bg-green-600' : 'bg-gray-800'}`}>
                <Text className="text-center text-sm font-semibold text-white">{d.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        <View className="px-4 pb-6">
          <Pressable
            onPress={handleCreate}
            disabled={saving || !name.trim()}
            className={`rounded-xl py-4 ${name.trim() ? 'bg-green-600' : 'bg-gray-700'}`}>
            <Text className="text-center text-base font-bold text-white">
              {saving ? 'Creating...' : 'Create Challenge'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
