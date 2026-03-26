import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { ProgressBar } from 'react-native-paper';

import { Button } from './Button';
import { useSession } from '~/src/modules/auth/hooks/useSession';
import { useTodayMeals, useAddMeal, useDeleteMeal } from '~/src/modules/tracking/hooks/useMeals';

const categories = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function NutritionTrack() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: meals, isLoading } = useTodayMeals(userId);
  const addMealMutation = useAddMeal(userId);
  const deleteMealMutation = useDeleteMeal(userId);

  const [goal] = useState(2500);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealCategory, setMealCategory] = useState<string>('');

  const totalCalories = (meals || []).reduce((sum, meal: any) => sum + (meal.calories || 0), 0);

  const saveMeal = () => {
    if (!mealName || !mealCalories) return;
    addMealMutation.mutate({
      name: mealName,
      calories: parseInt(mealCalories, 10),
      category: (mealCategory || 'snack') as any,
    });
    setMealName('');
    setMealCalories('');
    setMealCategory('');
  };

  const handleDelete = (id: string) => {
    deleteMealMutation.mutate(id);
  };

  if (isLoading) return <ActivityIndicator size="large" />;

  return (
    <View className="flex-1 p-2">
      <View className="flex-row items-center justify-center">
        <Text className="px-4 text-xl text-white">
          Daily Kcal: {totalCalories} / {goal} kcal
        </Text>
      </View>
      <ProgressBar
        progress={Math.min(totalCalories / goal, 1)}
        color="green"
        className="w-11/12 self-center px-2 py-4"
      />

      {/* Meal form */}
      <View className="m-2 gap-4 rounded-xl bg-gray-700 p-4">
        <View className="flex-row items-center gap-3">
          <Text className="w-24 font-semibold text-white">Name:</Text>
          <TextInput
            placeholderTextColor="#9ca3af"
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g. Chicken breast"
            className="flex-1 border-b border-gray-500 pb-1 text-white"
          />
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="w-24 font-semibold text-white">Calories:</Text>
          <TextInput
            placeholder="e.g. 300"
            placeholderTextColor="#9ca3af"
            className="flex-1 border-b border-gray-500 pb-1 text-white"
            value={mealCalories}
            onChangeText={setMealCalories}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="w-24 font-semibold text-white">Category:</Text>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setMealCategory(cat)}
              className={`rounded-lg px-3 py-1.5 ${mealCategory === cat ? 'bg-green-600' : 'bg-gray-600'}`}>
              <Text className="text-xs capitalize text-white">{cat}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        onPress={saveMeal}
        title="Add Meal"
        className="m-4"
        style={{ backgroundColor: 'green' }}
      />

      {/* Meal list */}
      {meals && meals.length > 0 && (
        <>
          <Text className="px-4 text-lg font-bold text-green-500">Today's Meals</Text>
          <FlatList
            scrollEnabled={false}
            data={meals}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: { item: any }) => (
              <View className="flex-row items-center justify-between border-b border-gray-700 p-3">
                <Text className="w-28 text-base text-white">{item.name}</Text>
                <Text className="w-16 text-center text-base text-white">{item.calories}</Text>
                <Text className="w-20 text-xs capitalize text-gray-400">{item.category}</Text>
                <Pressable onPress={() => handleDelete(item.id)}>
                  <FontAwesome name="close" size={18} color="#ef4444" />
                </Pressable>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}
