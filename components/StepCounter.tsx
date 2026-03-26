import { useEffect, useState } from 'react';
import { View, Platform, Text } from 'react-native';

import CircularProgress from './ProgressCircle';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useUpdateMetric } from '~/src/modules/tracking/hooks/useDailyMetrics';

export default function StepCounter() {
  const [steps, setSteps] = useState(0);
  const goal = 10000;
  const progress = (steps / goal) * 100;

  const { session } = useSession();
  const userId = session?.user?.id;
  const updateMetric = useUpdateMetric(userId);

  // Sync steps to Supabase when they change significantly
  useEffect(() => {
    if (steps > 0 && steps % 500 === 0) {
      updateMetric.mutate({ steps });
    }
  }, [steps]);

  useEffect(() => {
    // Web: step counting not available
    if (Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      const { Pedometer } = require('expo-sensors');
      const subscription = Pedometer.watchStepCount((result: any) => {
        setSteps(result.steps);
      });
      return () => subscription && subscription.remove();
    }

    if (Platform.OS === 'ios') {
      try {
        const AppleHealthKit = require('react-native-health').default;
        const permissions = {
          permissions: {
            read: [AppleHealthKit.Constants.Permissions.StepCount],
            write: [],
          },
        };

        AppleHealthKit.initHealthKit(permissions, (error: any) => {
          if (error) return;
          const options = {
            startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          };
          AppleHealthKit.getStepCount(options, (err: any, results: any) => {
            if (!err) setSteps(results.value);
          });
        });
      } catch {
        // HealthKit not available
      }
    }
  }, []);

  return (
    <View>
      <CircularProgress
        progress={progress}
        goal={goal}
        label="Steps"
        iconName="shoe-prints"
        color="red"
      />
      <Text className="text-center text-white">
        {Platform.OS === 'web' ? 'N/A on web' : `${steps} / ${goal}`}
      </Text>
    </View>
  );
}
