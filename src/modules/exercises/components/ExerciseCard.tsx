import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View, Text, Pressable } from 'react-native';

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    gif_url: string | null;
    target_muscles: string[];
    equipment: string[];
    body_parts: string[];
  };
  onPress?: () => void;
}

export default function ExerciseCard({ exercise, onPress }: ExerciseCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/exercise/${exercise.id}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="mb-3 flex-row items-center rounded-xl bg-gray-800 p-3">
      {exercise.gif_url ? (
        <Image
          source={{ uri: exercise.gif_url }}
          style={{ width: 64, height: 64, borderRadius: 8 }}
          contentFit="cover"
          cachePolicy="disk"
          placeholder={require('../../../../assets/icon.png')}
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-lg bg-gray-700">
          <Text className="text-2xl">💪</Text>
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold capitalize text-white" numberOfLines={1}>
          {exercise.name}
        </Text>
        <View className="mt-1 flex-row flex-wrap gap-1">
          {exercise.target_muscles.map((muscle) => (
            <View key={muscle} className="rounded-full bg-green-900 px-2 py-0.5">
              <Text className="text-xs capitalize text-green-400">{muscle}</Text>
            </View>
          ))}
          {exercise.equipment.map((eq) => (
            <View key={eq} className="rounded-full bg-blue-900 px-2 py-0.5">
              <Text className="text-xs capitalize text-blue-400">{eq}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
