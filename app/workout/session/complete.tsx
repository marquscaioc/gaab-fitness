import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { supabase } from '~/src/shared/lib/supabase';
import { formatDuration } from '~/src/modules/workouts/utils/volume-calc';

export default function WorkoutCompleteScreen() {
  const { sessionId, duration, sets, exercises, volume } = useLocalSearchParams<{
    sessionId: string;
    duration: string;
    sets: string;
    exercises: string;
    volume: string;
  }>();
  const { session } = useSession();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      // Call complete-workout Edge Function
      const { data, error } = await supabase.functions.invoke('complete-workout', {
        body: { session_id: sessionId, rating: rating || undefined, notes: notes.trim() || undefined },
      });

      if (error) {
        // Fallback: update directly
        await supabase
          .from('workout_sessions')
          .update({ rating: rating || null, notes: notes.trim() || null })
          .eq('id', sessionId);
      }

      setSaved(true);

      const newPRs = data?.new_prs || [];
      if (newPRs.length > 0) {
        Alert.alert(
          'New PR!',
          newPRs.map((pr: any) => `${pr.name}: ${pr.value} ${pr.unit || ''}`).join('\n')
        );
      }
    } catch {
      // Session already saved, just rating/notes failed
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="items-center pt-8">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-green-600">
              <FontAwesome name="check" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-white">Workout Complete!</Text>
          </View>

          {/* Stats */}
          <View className="mt-8 flex-row gap-3">
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-green-400">
                {formatDuration(parseInt(duration || '0', 10))}
              </Text>
              <Text className="mt-1 text-xs text-gray-400">Duration</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-blue-400">{exercises || '0'}</Text>
              <Text className="mt-1 text-xs text-gray-400">Exercises</Text>
            </View>
          </View>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-purple-400">{sets || '0'}</Text>
              <Text className="mt-1 text-xs text-gray-400">Sets</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-yellow-400">
                {parseFloat(volume || '0') > 1000
                  ? `${(parseFloat(volume || '0') / 1000).toFixed(1)}t`
                  : `${parseFloat(volume || '0').toFixed(0)}kg`}
              </Text>
              <Text className="mt-1 text-xs text-gray-400">Volume</Text>
            </View>
          </View>

          {/* Rating */}
          <View className="mt-8">
            <Text className="mb-3 text-center text-base text-gray-400">How was your workout?</Text>
            <View className="flex-row justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <FontAwesome
                    name={star <= rating ? 'star' : 'star-o'}
                    size={36}
                    color={star <= rating ? '#facc15' : '#4b5563'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View className="mt-6">
            <Text className="mb-2 text-sm text-gray-400">Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it feel? Any observations?"
              placeholderTextColor="#6b7280"
              multiline
              className="rounded-xl bg-gray-800 px-4 py-3 text-white"
              style={{ minHeight: 80 }}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Actions */}
        <View className="px-6 pb-8">
          {saved ? (
            <Pressable
              onPress={() => router.replace('/(home)/workout')}
              className="rounded-xl bg-green-600 py-4">
              <Text className="text-center text-base font-bold text-white">Done</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="rounded-xl bg-green-600 py-4">
              <Text className="text-center text-base font-bold text-white">
                {saving ? 'Saving...' : 'Save & Finish'}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
