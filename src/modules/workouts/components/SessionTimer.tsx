import { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';

import { useWorkoutSessionStore } from '../store/workoutSessionStore';
import { formatDuration } from '../utils/volume-calc';

export default function SessionTimer() {
  const { elapsedSeconds, isTimerRunning, tick, toggleTimer } = useWorkoutSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => tick(), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTimerRunning, tick]);

  return (
    <Pressable onPress={toggleTimer} className="items-center">
      <Text className="text-2xl font-bold tabular-nums text-white">
        {formatDuration(elapsedSeconds)}
      </Text>
      <Text className="text-xs text-gray-400">
        {isTimerRunning ? 'tap to pause' : 'tap to resume'}
      </Text>
    </Pressable>
  );
}
