import { Entypo, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useAuth } from '~/src/modules/auth/hooks/useAuth';
import { updateProfile } from '~/src/modules/profile/api/profile';

export default function SettingsScreen() {
  const { session, profile, refreshProfile } = useSession();
  const { signOut } = useAuth();
  const userId = session?.user?.id;

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isMetric, setIsMetric] = useState(profile?.unit_system !== 'imperial');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, {
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        unit_system: isMetric ? 'metric' : 'imperial',
      });
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated.');
    } catch {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Settings</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Account info */}
          <View className="mb-6 rounded-xl bg-gray-800 p-4">
            <Text className="mb-1 text-xs text-gray-500">Email</Text>
            <Text className="text-base text-white">{session?.user?.email}</Text>
            <Text className="mb-1 mt-3 text-xs text-gray-500">Username</Text>
            <Text className="text-base text-white">{profile?.username || 'Not set'}</Text>
          </View>

          {/* Editable fields */}
          <Text className="mb-2 text-sm text-gray-400">Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor="#6b7280"
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
          />

          <Text className="mb-2 text-sm text-gray-400">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself"
            placeholderTextColor="#6b7280"
            multiline
            className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
            style={{ minHeight: 60 }}
          />

          {/* Unit system */}
          <View className="mb-4 flex-row items-center justify-between rounded-xl bg-gray-800 p-4">
            <View>
              <Text className="text-base text-white">Metric Units</Text>
              <Text className="text-xs text-gray-400">
                {isMetric ? 'kg, cm, km' : 'lbs, ft/in, mi'}
              </Text>
            </View>
            <Switch
              value={isMetric}
              onValueChange={setIsMetric}
              trackColor={{ false: '#374151', true: '#166534' }}
              thumbColor={isMetric ? '#22c55e' : '#9ca3af'}
            />
          </View>

          <Pressable
            onPress={handleSaveProfile}
            disabled={saving}
            className="mb-4 rounded-xl bg-green-600 py-4">
            <Text className="text-center font-bold text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>

          {/* Quick links */}
          <View className="mb-4 gap-2">
            <Pressable
              onPress={() => router.push('/(home)/bmi')}
              className="flex-row items-center justify-between rounded-xl bg-gray-800 p-4">
              <Text className="text-base text-white">Health Metrics (BMI/BMR)</Text>
              <Entypo name="chevron-right" size={20} color="#6b7280" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile')}
              className="flex-row items-center justify-between rounded-xl bg-gray-800 p-4">
              <Text className="text-base text-white">Change Password</Text>
              <Entypo name="chevron-right" size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Sign out */}
          <Pressable
            onPress={handleSignOut}
            className="mb-10 rounded-xl bg-red-900 py-4">
            <Text className="text-center font-bold text-red-300">Sign Out</Text>
          </Pressable>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
