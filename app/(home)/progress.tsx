import { View, Text, SafeAreaView, ScrollView } from 'react-native';

export default function ProgressScreen() {
  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="border-b-hairline border-gray-300 p-6">
          <Text className="text-2xl font-bold text-green-500">Progress</Text>
        </View>
        <ScrollView className="flex-1 p-4">
          <Text className="text-center text-lg text-gray-400">
            Analytics and statistics will appear here after you complete workouts.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
