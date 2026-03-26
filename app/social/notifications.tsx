import { Entypo } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '~/src/modules/social/hooks/useNotifications';

export default function NotificationsScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: notifications, isLoading } = useNotifications(userId);
  const markRead = useMarkAsRead(userId);
  const markAllRead = useMarkAllAsRead(userId);

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Notifications</Text>
          <Pressable onPress={() => markAllRead.mutate()}>
            <Text className="text-sm text-green-400">Read All</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#22c55e" className="mt-10" />
        ) : !notifications || notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-gray-400">No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }: { item: any }) => (
              <Pressable
                onPress={() => {
                  if (!item.read) markRead.mutate(item.id);
                }}
                className={`mb-2 rounded-xl p-4 ${item.read ? 'bg-gray-800' : 'bg-gray-800 border border-green-800'}`}>
                <Text className="text-sm font-semibold text-white">{item.title}</Text>
                {item.body && (
                  <Text className="mt-1 text-sm text-gray-400">{item.body}</Text>
                )}
                <Text className="mt-1 text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
