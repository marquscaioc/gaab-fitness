import { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, Vibration } from 'react-native';

import { formatDuration } from '../utils/volume-calc';

interface RestTimerProps {
  initialSeconds?: number;
  onDismiss: () => void;
}

export default function RestTimer({ initialSeconds = 90, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          Vibration.vibrate([0, 500, 200, 500]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progress = 1 - remaining / initialSeconds;
  const isDone = remaining === 0;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/80">
      <View className="w-72 items-center rounded-2xl bg-gray-800 p-8">
        <Text className="mb-2 text-lg font-semibold text-gray-400">Rest Timer</Text>
        <Text className={`text-5xl font-bold tabular-nums ${isDone ? 'text-green-400' : 'text-white'}`}>
          {formatDuration(remaining)}
        </Text>

        {/* Progress bar */}
        <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-700">
          <View
            className={`h-full rounded-full ${isDone ? 'bg-green-500' : 'bg-green-600'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => setRemaining((prev) => prev + 30)}
            className="rounded-lg bg-gray-700 px-4 py-2">
            <Text className="text-sm text-white">+30s</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            className={`rounded-lg px-6 py-2 ${isDone ? 'bg-green-600' : 'bg-gray-600'}`}>
            <Text className="text-sm font-bold text-white">{isDone ? 'Continue' : 'Skip'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
