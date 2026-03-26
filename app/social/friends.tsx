import { Entypo, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useFriends, usePendingRequests } from '~/src/modules/social/hooks/useFeed';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest } from '~/src/modules/social/api/friendships';
import { searchProfiles } from '~/src/modules/profile/api/profile';

export default function FriendsScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: friends, isLoading: friendsLoading, refetch: refetchFriends } = useFriends(userId);
  const { data: pending, refetch: refetchPending } = usePendingRequests(userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    const { data } = await searchProfiles(searchQuery);
    setSearchResults((data || []).filter((u: any) => u.id !== userId));
    setSearching(false);
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!userId) return;
    try {
      await sendFriendRequest(userId, toUserId);
      Alert.alert('Sent', 'Friend request sent.');
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        Alert.alert('Already Sent', 'Request already exists.');
      } else {
        Alert.alert('Error', 'Failed to send request.');
      }
    }
  };

  const handleAccept = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
    refetchFriends();
    refetchPending();
  };

  const handleReject = async (friendshipId: string) => {
    await rejectFriendRequest(friendshipId);
    refetchPending();
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Friends</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search */}
        <View className="mx-4 mb-3 flex-row items-center gap-2">
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by username..."
            placeholderTextColor="#6b7280"
            className="flex-1 rounded-xl bg-gray-800 px-4 py-3 text-white"
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
          />
          <Pressable onPress={handleSearch} className="rounded-xl bg-green-700 p-3">
            <FontAwesome name="search" size={16} color="white" />
          </Pressable>
        </View>

        {/* Search results */}
        {searchResults.length > 0 && (
          <View className="mx-4 mb-4">
            <Text className="mb-2 text-sm font-semibold text-gray-400">Search Results</Text>
            {searchResults.map((user) => (
              <View key={user.id} className="mb-2 flex-row items-center justify-between rounded-lg bg-gray-800 p-3">
                <View className="flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-green-800">
                    <Text className="text-sm font-bold text-white">{user.username?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text className="ml-3 text-sm text-white">{user.display_name || user.username}</Text>
                </View>
                <Pressable onPress={() => handleSendRequest(user.id)} className="rounded-lg bg-green-700 px-3 py-1.5">
                  <Text className="text-xs font-bold text-white">Add</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Pending requests */}
        {pending && pending.length > 0 && (
          <View className="mx-4 mb-4">
            <Text className="mb-2 text-sm font-semibold text-yellow-400">Pending Requests ({pending.length})</Text>
            {pending.map((req: any) => (
              <View key={req.id} className="mb-2 flex-row items-center justify-between rounded-lg bg-gray-800 p-3">
                <Text className="text-sm text-white">
                  {req.requester?.display_name || req.requester?.username}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable onPress={() => handleAccept(req.id)} className="rounded-lg bg-green-700 px-3 py-1.5">
                    <Text className="text-xs font-bold text-white">Accept</Text>
                  </Pressable>
                  <Pressable onPress={() => handleReject(req.id)} className="rounded-lg bg-red-800 px-3 py-1.5">
                    <Text className="text-xs font-bold text-white">Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friends list */}
        <View className="mx-4 flex-1">
          <Text className="mb-2 text-sm font-semibold text-gray-400">
            Friends {friends ? `(${friends.length})` : ''}
          </Text>
          {friendsLoading ? (
            <ActivityIndicator color="#22c55e" />
          ) : !friends || friends.length === 0 ? (
            <Text className="text-center text-gray-500">No friends yet. Search to add some!</Text>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: { item: any }) => (
                <View className="mb-2 flex-row items-center rounded-lg bg-gray-800 p-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-green-800">
                    <Text className="text-base font-bold text-white">
                      {(item.username || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="ml-3 text-base text-white">
                    {item.display_name || item.username}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
