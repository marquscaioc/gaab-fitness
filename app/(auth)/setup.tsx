import { router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';

import { useSession } from '~/src/modules/auth/hooks/useSession';
import { updateProfile } from '~/src/modules/profile/api/profile';

const FITNESS_GOALS = [
  { id: 'lose_fat', label: 'Lose Fat', icon: '🔥' },
  { id: 'build_muscle', label: 'Build Muscle', icon: '💪' },
  { id: 'get_stronger', label: 'Get Stronger', icon: '🏋️' },
  { id: 'improve_endurance', label: 'Improve Endurance', icon: '🏃' },
  { id: 'stay_healthy', label: 'Stay Healthy', icon: '❤️' },
  { id: 'flexibility', label: 'Flexibility', icon: '🧘' },
];

const LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'New to working out' },
  { id: 'intermediate', label: 'Intermediate', desc: '6+ months experience' },
  { id: 'advanced', label: 'Advanced', desc: '2+ years consistent' },
  { id: 'expert', label: 'Expert', desc: '5+ years, competitive' },
] as const;

type Step = 'goals' | 'level' | 'metrics' | 'units';

export default function SetupScreen() {
  const { session, refreshProfile } = useSession();
  const [step, setStep] = useState<Step>('goals');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [level, setLevel] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [dob, setDob] = useState('');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [saving, setSaving] = useState(false);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      await updateProfile(session.user.id, {
        fitness_level: level as any,
        gender: gender || undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        date_of_birth: dob || undefined,
        unit_system: unitSystem,
        bio: selectedGoals.join(', '),
        onboarding_completed: true,
      });
      await refreshProfile();
      router.replace('/(home)');
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps: Step[] = ['goals', 'level', 'metrics', 'units'];
  const currentIndex = steps.indexOf(step);

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView
        className="flex-1"
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        {/* Progress */}
        <View className="flex-row gap-2 px-6 pt-4">
          {steps.map((s, i) => (
            <View
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= currentIndex ? 'bg-green-500' : 'bg-gray-700'}`}
            />
          ))}
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {/* Step 1: Goals */}
          {step === 'goals' && (
            <View>
              <Text className="mb-2 text-2xl font-bold text-white">What are your goals?</Text>
              <Text className="mb-6 text-base text-gray-400">Select all that apply</Text>
              <View className="gap-3">
                {FITNESS_GOALS.map((goal) => {
                  const selected = selectedGoals.includes(goal.id);
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => toggleGoal(goal.id)}
                      className={`flex-row items-center rounded-xl p-4 ${selected ? 'bg-green-800 border border-green-500' : 'bg-gray-800'}`}>
                      <Text className="text-2xl">{goal.icon}</Text>
                      <Text className={`ml-4 text-lg ${selected ? 'font-bold text-white' : 'text-gray-300'}`}>
                        {goal.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 2: Fitness Level */}
          {step === 'level' && (
            <View>
              <Text className="mb-2 text-2xl font-bold text-white">Your fitness level?</Text>
              <Text className="mb-6 text-base text-gray-400">This helps us personalize recommendations</Text>
              <View className="gap-3">
                {LEVELS.map((l) => {
                  const selected = level === l.id;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => setLevel(l.id)}
                      className={`rounded-xl p-4 ${selected ? 'bg-green-800 border border-green-500' : 'bg-gray-800'}`}>
                      <Text className={`text-lg ${selected ? 'font-bold text-white' : 'text-gray-300'}`}>
                        {l.label}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-400">{l.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 3: Body Metrics */}
          {step === 'metrics' && (
            <View>
              <Text className="mb-2 text-2xl font-bold text-white">Body metrics</Text>
              <Text className="mb-6 text-base text-gray-400">Optional — helps calculate BMR and track progress</Text>

              <Text className="mb-2 text-sm text-gray-400">Gender</Text>
              <View className="mb-4 flex-row gap-3">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    className={`flex-1 rounded-xl py-3 ${gender === g ? 'bg-green-600' : 'bg-gray-800'}`}>
                    <Text className="text-center capitalize text-white">{g}</Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-2 text-sm text-gray-400">Height (cm)</Text>
              <TextInput
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
                className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
              />

              <Text className="mb-2 text-sm text-gray-400">Weight (kg)</Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="70"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
                className="mb-4 rounded-xl bg-gray-800 px-4 py-3 text-white"
              />

              <Text className="mb-2 text-sm text-gray-400">Date of birth (YYYY-MM-DD)</Text>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="1995-06-15"
                placeholderTextColor="#6b7280"
                className="rounded-xl bg-gray-800 px-4 py-3 text-white"
              />
            </View>
          )}

          {/* Step 4: Unit System */}
          {step === 'units' && (
            <View>
              <Text className="mb-2 text-2xl font-bold text-white">Preferred units</Text>
              <Text className="mb-6 text-base text-gray-400">You can change this anytime in settings</Text>
              <View className="gap-3">
                <Pressable
                  onPress={() => setUnitSystem('metric')}
                  className={`rounded-xl p-5 ${unitSystem === 'metric' ? 'bg-green-800 border border-green-500' : 'bg-gray-800'}`}>
                  <Text className="text-lg font-bold text-white">Metric</Text>
                  <Text className="mt-1 text-sm text-gray-400">Kilograms, centimeters, kilometers</Text>
                </Pressable>
                <Pressable
                  onPress={() => setUnitSystem('imperial')}
                  className={`rounded-xl p-5 ${unitSystem === 'imperial' ? 'bg-green-800 border border-green-500' : 'bg-gray-800'}`}>
                  <Text className="text-lg font-bold text-white">Imperial</Text>
                  <Text className="mt-1 text-sm text-gray-400">Pounds, feet/inches, miles</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Navigation */}
        <View className="flex-row gap-3 px-6 pb-8">
          {currentIndex > 0 && (
            <Pressable
              onPress={() => setStep(steps[currentIndex - 1])}
              className="flex-1 rounded-xl bg-gray-700 py-4">
              <Text className="text-center font-bold text-white">Back</Text>
            </Pressable>
          )}
          {currentIndex < steps.length - 1 ? (
            <Pressable
              onPress={() => setStep(steps[currentIndex + 1])}
              className="flex-1 rounded-xl bg-green-600 py-4">
              <Text className="text-center font-bold text-white">Next</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleFinish}
              disabled={saving}
              className="flex-1 rounded-xl bg-green-600 py-4">
              <Text className="text-center font-bold text-white">
                {saving ? 'Saving...' : 'Finish Setup'}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
