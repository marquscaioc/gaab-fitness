import { Entypo, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { supabase } from '~/src/shared/lib/supabase';
import { sendFriendRequest } from '~/src/modules/social/api/friendships';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const myUserId = session?.user?.id;
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ workouts: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        setProfile(profileData);

        const { count } = await supabase
          .from('workout_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', id);

        setStats({
          workouts: count || 0,
          streak: profileData?.streak_count || 0,
        });
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const handleAddFriend = async () => {
    if (!myUserId || !id) return;
    try {
      await sendFriendRequest(myUserId, id);
      Alert.alert('Sent', 'Friend request sent.');
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        Alert.alert('Already Sent', 'Request already exists.');
      } else {
        Alert.alert('Error', 'Failed to send request.');
      }
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-900">
        <Text className="text-white">User not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-green-400">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isOwnProfile = myUserId === id;

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Profile</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Avatar + name */}
          <View className="items-center pt-4">
            {profile.avatar_url ? (
              <View className="h-24 w-24 rounded-full bg-gray-700" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-green-800">
                <Text className="text-4xl font-bold text-white">
                  {(profile.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text className="mt-3 text-2xl font-bold text-white">
              {profile.display_name || profile.username}
            </Text>
            <Text className="text-sm text-gray-400">@{profile.username}</Text>
            {profile.bio && (
              <Text className="mt-2 text-center text-base text-gray-300">{profile.bio}</Text>
            )}
          </View>

          {/* Stats */}
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-green-400">{stats.workouts}</Text>
              <Text className="text-xs text-gray-400">Workouts</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-orange-400">{stats.streak}</Text>
              <Text className="text-xs text-gray-400">Day Streak</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-gray-800 p-4">
              <Text className="text-2xl font-bold text-blue-400">
                {profile.longest_streak || 0}
              </Text>
              <Text className="text-xs text-gray-400">Best Streak</Text>
            </View>
          </View>

          {/* Info */}
          <View className="mt-4 gap-2">
            {profile.fitness_level && (
              <View className="flex-row items-center rounded-xl bg-gray-800 p-3">
                <FontAwesome name="signal" size={14} color="#9ca3af" />
                <Text className="ml-3 capitalize text-gray-300">{profile.fitness_level}</Text>
              </View>
            )}
            {profile.unit_system && (
              <View className="flex-row items-center rounded-xl bg-gray-800 p-3">
                <FontAwesome name="balance-scale" size={14} color="#9ca3af" />
                <Text className="ml-3 capitalize text-gray-300">{profile.unit_system}</Text>
              </View>
            )}
          </View>

          {/* Add friend */}
          {!isOwnProfile && (
            <Pressable
              onPress={handleAddFriend}
              className="mt-6 rounded-xl bg-green-600 py-4">
              <Text className="text-center font-bold text-white">Add Friend</Text>
            </Pressable>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
