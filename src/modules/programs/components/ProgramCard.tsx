import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View, Text, Pressable } from 'react-native';

interface ProgramCardProps {
  program: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    level: string | null;
    duration_weeks: number | null;
    sessions_per_week: number | null;
    cover_image_url: string | null;
    participant_count: number;
  };
}

const levelColors: Record<string, string> = {
  beginner: 'bg-green-700',
  intermediate: 'bg-yellow-700',
  advanced: 'bg-orange-700',
  expert: 'bg-red-700',
};

export default function ProgramCard({ program }: ProgramCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/program/${program.id}`)}
      className="mb-3 overflow-hidden rounded-xl bg-gray-800">
      {program.cover_image_url && (
        <Image
          source={{ uri: program.cover_image_url }}
          style={{ width: '100%', height: 120 }}
          contentFit="cover"
          cachePolicy="disk"
        />
      )}
      <View className="p-4">
        <Text className="text-lg font-bold text-white">{program.name}</Text>
        {program.description && (
          <Text className="mt-1 text-sm text-gray-400" numberOfLines={2}>{program.description}</Text>
        )}
        <View className="mt-2 flex-row flex-wrap gap-2">
          {program.level && (
            <View className={`rounded-full px-2.5 py-0.5 ${levelColors[program.level] || 'bg-gray-600'}`}>
              <Text className="text-xs capitalize text-white">{program.level}</Text>
            </View>
          )}
          {program.duration_weeks && (
            <View className="rounded-full bg-gray-700 px-2.5 py-0.5">
              <Text className="text-xs text-gray-300">{program.duration_weeks} weeks</Text>
            </View>
          )}
          {program.sessions_per_week && (
            <View className="rounded-full bg-gray-700 px-2.5 py-0.5">
              <Text className="text-xs text-gray-300">{program.sessions_per_week}x/week</Text>
            </View>
          )}
          <View className="rounded-full bg-gray-700 px-2.5 py-0.5">
            <Text className="text-xs text-gray-300">{program.participant_count} enrolled</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
