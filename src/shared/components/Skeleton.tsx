import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#374151',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ExerciseCardSkeleton() {
  return (
    <View className="mb-3 flex-row items-center rounded-xl bg-gray-800 p-3">
      <Skeleton width={64} height={64} borderRadius={8} />
      <View className="ml-3 flex-1 gap-2">
        <Skeleton width="70%" height={16} />
        <View className="flex-row gap-1">
          <Skeleton width={60} height={20} borderRadius={10} />
          <Skeleton width={50} height={20} borderRadius={10} />
        </View>
      </View>
    </View>
  );
}

export function SessionCardSkeleton() {
  return (
    <View className="mb-3 rounded-xl bg-gray-800 p-4">
      <Skeleton width="60%" height={18} />
      <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
      <View className="mt-2 flex-row gap-4">
        <Skeleton width={50} height={12} />
        <Skeleton width={80} height={12} />
        <Skeleton width={40} height={12} />
      </View>
    </View>
  );
}

export function FeedPostSkeleton() {
  return (
    <View className="mb-3 rounded-xl bg-gray-800 p-4">
      <View className="flex-row items-center">
        <Skeleton width={40} height={40} borderRadius={20} />
        <View className="ml-3 gap-2">
          <Skeleton width={120} height={14} />
          <Skeleton width={60} height={10} />
        </View>
      </View>
      <Skeleton width="90%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="60%" height={14} style={{ marginTop: 6 }} />
    </View>
  );
}
