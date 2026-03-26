import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, Text, SafeAreaView, FlatList, Pressable, Platform, StatusBar, ActivityIndicator } from 'react-native';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import FeedPost from '~/src/modules/social/components/FeedPost';
import { useFeed } from '~/src/modules/social/hooks/useFeed';
import { useUnreadCount } from '~/src/modules/social/hooks/useNotifications';
import { toggleReaction } from '~/src/modules/social/api/feed';

export default function SocialTab() {
  const { session } = useSession();
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useFeed();
  const { data: unreadCount } = useUnreadCount(session?.user?.id);

  const posts = data?.pages.flat() || [];

  const handleReact = async (postId: string) => {
    if (!session?.user?.id) return;
    await toggleReaction(postId, session.user.id);
    refetch();
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView
        className="flex-1"
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View className="flex-row items-center justify-between border-b border-gray-800 px-6 py-4">
          <Text className="text-2xl font-bold text-green-500">Feed</Text>
          <View className="flex-row gap-4">
            <Pressable onPress={() => router.push('/social/notifications')} className="relative">
              <FontAwesome name="bell" size={20} color="#9ca3af" />
              {(unreadCount || 0) > 0 && (
                <View className="absolute -right-2 -top-1 h-4 w-4 items-center justify-center rounded-full bg-red-500">
                  <Text className="text-[10px] font-bold text-white">{unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/social/create-challenge')}>
              <FontAwesome name="trophy" size={20} color="#9ca3af" />
            </Pressable>
            <Pressable onPress={() => router.push('/social/friends')}>
              <FontAwesome name="user-plus" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#22c55e" className="mt-10" />
        ) : posts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <FontAwesome name="users" size={50} color="#4b5563" />
            <Text className="mt-4 text-center text-lg text-gray-400">No posts yet</Text>
            <Text className="mt-1 text-center text-sm text-gray-500">
              Add friends to see their workouts here. Complete a workout to post automatically.
            </Text>
            <Pressable
              onPress={() => router.push('/social/friends')}
              className="mt-4 rounded-xl bg-green-700 px-6 py-3">
              <Text className="font-bold text-white">Find Friends</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            onRefresh={() => refetch()}
            refreshing={isLoading}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.5}
            renderItem={({ item }: { item: any }) => (
              <FeedPost post={item} onReact={() => handleReact(item.id)} />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
