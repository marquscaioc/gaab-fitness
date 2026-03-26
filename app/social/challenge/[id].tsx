import { Entypo, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { getChallengeById, joinChallenge, leaveChallenge } from '~/src/modules/social/api/challenges';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user?.id;
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await getChallengeById(id);
      setChallenge(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-white">Challenge not found</Text>
      </SafeAreaView>
    );
  }

  const participants = challenge.challenge_participants || [];
  const isJoined = participants.some((p: any) => p.user_id === userId);
  const leaderboard = [...participants].sort((a: any, b: any) => b.current_value - a.current_value);
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.ends_at).getTime() - Date.now()) / 86400000));

  const handleJoin = async () => {
    if (!userId || !id) return;
    try {
      await joinChallenge(id, userId);
      const { data } = await getChallengeById(id);
      setChallenge(data);
    } catch {
      Alert.alert('Error', 'Failed to join challenge.');
    }
  };

  const handleLeave = async () => {
    if (!userId || !id) return;
    Alert.alert('Leave Challenge?', 'Your progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveChallenge(id, userId);
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Challenge</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4">
          <Text className="text-2xl font-bold text-white">{challenge.name}</Text>
          {challenge.description && (
            <Text className="mt-2 text-base text-gray-400">{challenge.description}</Text>
          )}

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Type</Text>
              <Text className="text-sm capitalize text-white">{challenge.challenge_type}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Days Left</Text>
              <Text className="text-sm text-white">{daysLeft}</Text>
            </View>
            <View className="flex-1 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Participants</Text>
              <Text className="text-sm text-white">{participants.length}</Text>
            </View>
          </View>

          {challenge.target_value && (
            <View className="mt-3 rounded-xl bg-gray-800 p-3">
              <Text className="text-xs text-gray-500">Target</Text>
              <Text className="text-lg font-bold text-green-400">
                {challenge.target_value} {challenge.target_unit || ''}
              </Text>
            </View>
          )}

          {/* Leaderboard */}
          <Text className="mb-3 mt-6 text-lg font-semibold text-white">Leaderboard</Text>
          {leaderboard.map((p: any, index: number) => (
            <View
              key={p.user_id}
              className={`mb-2 flex-row items-center rounded-xl p-3 ${
                index === 0 ? 'bg-yellow-900/30' : 'bg-gray-800'
              }`}>
              <Text className="w-8 text-center text-lg font-bold text-gray-400">
                {index + 1}
              </Text>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-green-800">
                <Text className="text-sm font-bold text-white">
                  {(p.profiles?.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="ml-3 flex-1 text-base text-white">
                {p.profiles?.display_name || p.profiles?.username || 'User'}
              </Text>
              <Text className="text-lg font-bold text-green-400">
                {p.current_value} {challenge.target_unit || ''}
              </Text>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Join/Leave button */}
        <View className="px-4 pb-6">
          {isJoined ? (
            <Pressable onPress={handleLeave} className="rounded-xl bg-red-800 py-4">
              <Text className="text-center text-base font-bold text-white">Leave Challenge</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleJoin} className="rounded-xl bg-green-600 py-4">
              <Text className="text-center text-base font-bold text-white">Join Challenge</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
