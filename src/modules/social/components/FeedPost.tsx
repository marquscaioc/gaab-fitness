import { FontAwesome } from '@expo/vector-icons';
import { View, Text, Pressable } from 'react-native';

interface FeedPostProps {
  post: {
    id: string;
    post_type: string;
    content: string | null;
    created_at: string;
    profiles?: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  onReact?: () => void;
}

const postTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  workout_completed: { label: 'Completed a workout', icon: 'check-circle', color: 'text-green-400' },
  pr_achieved: { label: 'New personal record!', icon: 'trophy', color: 'text-yellow-400' },
  streak_milestone: { label: 'Streak milestone', icon: 'fire', color: 'text-orange-400' },
  program_completed: { label: 'Finished a program', icon: 'graduation-cap', color: 'text-blue-400' },
  manual: { label: '', icon: 'comment', color: 'text-gray-400' },
};

export default function FeedPost({ post, onReact }: FeedPostProps) {
  const profile = post.profiles;
  const typeInfo = postTypeLabels[post.post_type] || postTypeLabels.manual;
  const date = new Date(post.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <View className="mb-3 rounded-xl bg-gray-800 p-4">
      {/* Header */}
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-green-800">
          <Text className="text-base font-bold text-white">
            {(profile?.username || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-white">
            {profile?.display_name || profile?.username || 'User'}
          </Text>
          <Text className="text-xs text-gray-500">{timeAgo}</Text>
        </View>
      </View>

      {/* Type badge */}
      {typeInfo.label && (
        <View className="mt-2 flex-row items-center">
          <FontAwesome name={typeInfo.icon as any} size={14} color="#22c55e" />
          <Text className={`ml-2 text-sm font-semibold ${typeInfo.color}`}>{typeInfo.label}</Text>
        </View>
      )}

      {/* Content */}
      {post.content && (
        <Text className="mt-2 text-base text-gray-300">{post.content}</Text>
      )}

      {/* Actions */}
      <View className="mt-3 flex-row gap-4 border-t border-gray-700 pt-3">
        <Pressable onPress={onReact} className="flex-row items-center">
          <Text className="text-lg">🔥</Text>
          <Text className="ml-1 text-xs text-gray-400">React</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
