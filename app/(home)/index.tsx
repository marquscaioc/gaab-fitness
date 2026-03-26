import { FontAwesome } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';

import MainNutritionTrack from '~/components/MainNutritionTrack';
import MainWaterIntake from '~/components/MainWaterIntake';
import StepCounter from '~/components/StepCounter';
import StreakTrack from '~/components/StreakTrack';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useAuth } from '~/src/modules/auth/hooks/useAuth';

export default function HomePage() {
  const { session, profile, isLoading } = useSession();
  const { signOut } = useAuth();

  if (isLoading) return null;

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const displayName = profile?.display_name || profile?.username || session.user.email || 'User';
  const avatarUrl = profile?.avatar_url;

  return (
    <SafeAreaView
      className="flex-1 bg-gray-900"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <View className="border-b-hairline flex-row items-center gap-5 border-gray-300 p-4">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-16 w-16 rounded-full" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-green-700">
            <Text className="text-2xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-lg text-white">Welcome Back!</Text>
          <Text className="text-xl font-bold text-white">{displayName}</Text>
        </View>
        <Pressable className="flex-row gap-5 p-1">
          <FontAwesome
            name="user"
            size={30}
            color="gray"
            onPress={() => router.push('../profile')}
          />
          <FontAwesome name="sign-out" size={30} color="red" onPress={() => signOut()} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} className="mb-20 pb-4">
        <StreakTrack />
        <View className="border-b-hairline border-t-hairline m-4 flex-row items-center justify-around border-gray-300 p-2">
          <MainNutritionTrack />
          <StepCounter />
          <MainWaterIntake
            label="Water"
            color="#3498db"
            storageKey="weeklyWaterIntake"
            goal={2500}
          />
        </View>
      </ScrollView>
      <StatusBar barStyle="light-content" />
    </SafeAreaView>
  );
}
