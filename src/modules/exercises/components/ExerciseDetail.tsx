import { Image } from 'expo-image';
import { View, Text, ScrollView } from 'react-native';

interface ExerciseDetailProps {
  exercise: {
    id: string;
    name: string;
    gif_url: string | null;
    instructions: string[] | null;
    equipment: string[];
    body_parts: string[];
    target_muscles: string[];
    secondary_muscles: string[];
    exercise_type: string | null;
    mechanics_type: string | null;
  };
}

export default function ExerciseDetail({ exercise }: ExerciseDetailProps) {
  return (
    <ScrollView className="flex-1 bg-gray-900" showsVerticalScrollIndicator={false}>
      {/* GIF */}
      {exercise.gif_url && (
        <View className="items-center bg-gray-800 p-4">
          <Image
            source={{ uri: exercise.gif_url }}
            style={{ width: 300, height: 300, borderRadius: 12 }}
            contentFit="contain"
            cachePolicy="disk"
          />
        </View>
      )}

      <View className="p-4">
        {/* Name */}
        <Text className="text-2xl font-bold capitalize text-white">{exercise.name}</Text>

        {/* Tags */}
        <View className="mt-3 flex-row flex-wrap gap-2">
          {exercise.target_muscles.map((m) => (
            <View key={`tm-${m}`} className="rounded-full bg-green-900 px-3 py-1">
              <Text className="text-sm capitalize text-green-400">{m}</Text>
            </View>
          ))}
          {exercise.secondary_muscles.map((m) => (
            <View key={`sm-${m}`} className="rounded-full bg-emerald-900 px-3 py-1">
              <Text className="text-sm capitalize text-emerald-400">{m}</Text>
            </View>
          ))}
          {exercise.equipment.map((e) => (
            <View key={`eq-${e}`} className="rounded-full bg-blue-900 px-3 py-1">
              <Text className="text-sm capitalize text-blue-400">{e}</Text>
            </View>
          ))}
          {exercise.body_parts.map((b) => (
            <View key={`bp-${b}`} className="rounded-full bg-purple-900 px-3 py-1">
              <Text className="text-sm capitalize text-purple-400">{b}</Text>
            </View>
          ))}
          {exercise.mechanics_type && (
            <View className="rounded-full bg-yellow-900 px-3 py-1">
              <Text className="text-sm capitalize text-yellow-400">{exercise.mechanics_type}</Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <View className="mt-5">
            <Text className="mb-2 text-lg font-semibold text-white">Instructions</Text>
            {exercise.instructions.map((instruction, index) => {
              const cleanedText = instruction.replace(/^Step:\d+\s*/, '');
              return (
                <View key={index} className="mb-2 flex-row">
                  <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-green-700">
                    <Text className="text-xs font-bold text-white">{index + 1}</Text>
                  </View>
                  <Text className="flex-1 text-base leading-6 text-gray-300">{cleanedText}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
