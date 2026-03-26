import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { View, Platform, Text } from 'react-native';
import AppleHealthKit, { HealthInputOptions, HealthKitPermissions } from 'react-native-health';

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
    if (Platform.OS === 'android') {
      const subscription = Pedometer.watchStepCount((result) => {
        setSteps(result.steps);
      });

      return () => subscription && subscription.remove();
    } else {
      const permissions: HealthKitPermissions = {
        permissions: {
          read: [AppleHealthKit.Constants.Permissions.StepCount],
          write: [],
        },
      };

      AppleHealthKit.initHealthKit(permissions, (error) => {
        if (error) return console.log('HealthKit initialization failed:', error);

        const options: HealthInputOptions = {
          startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        };

        AppleHealthKit.getStepCount(options, (err, results) => {
          if (!err) setSteps(results.value);
        });
      });
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
        {steps} / {goal}
      </Text>
    </View>
  );
}
