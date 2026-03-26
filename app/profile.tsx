import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';

import { Button } from '~/components/Button';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { supabase } from '~/src/shared/lib/supabase';

export default function Profile() {
  const { session, profile } = useSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill out all password fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Success', 'Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password.');
    }
  };

  const handleDeleteUser = async () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out -- actual deletion requires a server-side admin call
              await supabase.auth.signOut();
              router.replace('/(auth)/sign-in');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView>
        <View className="border-b-hairline flex-row items-center border-gray-300 p-6">
          <Text className="flex-1 text-2xl font-bold text-green-500">Profile</Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-xl text-gray-200">Back</Text>
          </Pressable>
        </View>
        <View className="p-4">
          <View className="mb-4 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-green-700">
              <Text className="text-3xl font-bold text-white">
                {(profile?.username || session?.user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <View className="border-hairline border-gray-300 p-2">
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Email:</Text>
              <Text style={styles.infoText}>{session?.user?.email}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Username:</Text>
              <Text style={styles.infoText}>{profile?.username || 'Not set'}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>New Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter New Password..."
                value={password}
                secureTextEntry
                onChangeText={setPassword}
                placeholderTextColor="gray"
              />
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Confirm:</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password..."
                value={confirmPassword}
                secureTextEntry
                onChangeText={setConfirmPassword}
                placeholderTextColor="gray"
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button title="Update Password" onPress={handleChangePassword} className="mx-5" />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Health Metrics (BMI/BMR)"
              onPress={() => router.push('/(home)/bmi')}
              className="mx-5 bg-blue-600"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button title="Delete Account" onPress={handleDeleteUser} className="mx-5 bg-red-500" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 10,
    marginVertical: 8,
  },
  infoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    width: 150,
  },
  infoText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    borderBottomWidth: 1,
    borderColor: 'white',
    padding: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    borderBottomWidth: 1,
    borderColor: 'white',
    padding: 5,
  },
  buttonContainer: {
    marginVertical: 10,
  },
});
