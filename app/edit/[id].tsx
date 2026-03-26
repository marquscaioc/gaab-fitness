import { Entypo } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';

import { Button } from '~/components/Button';
import { supabase } from '~/src/shared/lib/supabase';
import { updateTemplate } from '~/src/modules/workouts/api/templates';

export default function EditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        setTemplate(data);
        setName(data.name || '');
        setCategory(data.category || '');
        setDescription(data.description || '');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id || !name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }
    try {
      await updateTemplate(id, { name: name.trim(), category, description });
      Alert.alert('Saved', 'Template updated.');
      router.push('/(home)/workout');
    } catch {
      Alert.alert('Error', 'Failed to update template.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!template) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-gray-900">
        <Text className="text-white">Template not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="font-bold text-blue-300">BACK</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Entypo name="chevron-left" size={28} color="white" />
          </Pressable>
          <Text className="text-lg font-semibold text-white">Edit Template</Text>
          <Pressable onPress={() => router.push('/(home)/workout')}>
            <Text className="font-bold text-red-500">Cancel</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <Text className="mb-2 text-sm text-gray-400">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Workout Name"
            className="mb-4 rounded-xl bg-gray-800 p-4 text-white"
            placeholderTextColor="#6b7280"
          />

          <Text className="mb-2 text-sm text-gray-400">Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. push, pull, legs"
            className="mb-4 rounded-xl bg-gray-800 p-4 text-white"
            placeholderTextColor="#6b7280"
          />

          <Text className="mb-2 text-sm text-gray-400">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            className="mb-4 rounded-xl bg-gray-800 p-4 text-white"
            placeholderTextColor="#6b7280"
            multiline
            style={{ minHeight: 100 }}
          />
        </ScrollView>

        <View className="px-4 pb-6">
          <Button
            title="Save Changes"
            onPress={handleSave}
            className="bg-green-600"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
