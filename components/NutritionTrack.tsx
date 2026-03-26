import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput } from 'react-native';
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
  const [mealProtein, setMealProtein] = useState('');
  const [mealCarbs, setMealCarbs] = useState('');
  const [mealFat, setMealFat] = useState('');
  const [mealCategory, setMealCategory] = useState<string>('');

  const totalCalories = (meals || []).reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
  const totalProtein = (meals || []).reduce((sum: number, meal: any) => sum + (meal.protein_g || 0), 0);
  const totalCarbs = (meals || []).reduce((sum: number, meal: any) => sum + (meal.carbs_g || 0), 0);
  const totalFat = (meals || []).reduce((sum: number, meal: any) => sum + (meal.fat_g || 0), 0);

  const saveMeal = () => {
    if (!mealName || !mealCalories) return;
    addMealMutation.mutate({
      name: mealName,
      calories: parseInt(mealCalories, 10),
      protein_g: mealProtein ? parseFloat(mealProtein) : undefined,
      carbs_g: mealCarbs ? parseFloat(mealCarbs) : undefined,
      fat_g: mealFat ? parseFloat(mealFat) : undefined,
      category: (mealCategory || 'snack') as any,
    });
    setMealName('');
    setMealCalories('');
    setMealProtein('');
    setMealCarbs('');
    setMealFat('');
    setMealCategory('');
  };

  const handleDelete = (id: string) => {
    deleteMealMutation.mutate(id);
  };

  if (isLoading) return <ActivityIndicator size="large" />;

  return (
    <View className="flex-1 p-2">
      {/* Calorie progress */}
      <View className="flex-row items-center justify-center">
        <Text className="px-4 text-xl text-white">
          {totalCalories} / {goal} kcal
        </Text>
      </View>
      <ProgressBar
        progress={Math.min(totalCalories / goal, 1)}
        color="green"
        className="w-11/12 self-center px-2 py-4"
      />

      {/* Macro summary */}
      <View className="mx-2 mb-4 flex-row gap-2">
        <View className="flex-1 rounded-xl bg-blue-900/40 p-3">
          <Text className="text-center text-xs text-blue-300">Protein</Text>
          <Text className="text-center text-lg font-bold text-blue-400">{totalProtein.toFixed(0)}g</Text>
          <ProgressBar progress={Math.min(totalProtein / 150, 1)} color="#60a5fa" className="mt-1" />
        </View>
        <View className="flex-1 rounded-xl bg-yellow-900/40 p-3">
          <Text className="text-center text-xs text-yellow-300">Carbs</Text>
          <Text className="text-center text-lg font-bold text-yellow-400">{totalCarbs.toFixed(0)}g</Text>
          <ProgressBar progress={Math.min(totalCarbs / 300, 1)} color="#fbbf24" className="mt-1" />
        </View>
        <View className="flex-1 rounded-xl bg-red-900/40 p-3">
          <Text className="text-center text-xs text-red-300">Fat</Text>
          <Text className="text-center text-lg font-bold text-red-400">{totalFat.toFixed(0)}g</Text>
          <ProgressBar progress={Math.min(totalFat / 80, 1)} color="#f87171" className="mt-1" />
        </View>
      </View>

      {/* Meal form */}
      <View className="m-2 gap-3 rounded-xl bg-gray-700 p-4">
        <View className="flex-row items-center gap-3">
          <Text className="w-16 text-sm text-gray-300">Name</Text>
          <TextInput
            placeholderTextColor="#6b7280"
            value={mealName}
            onChangeText={setMealName}
            placeholder="Chicken breast"
            className="flex-1 border-b border-gray-500 pb-1 text-white"
          />
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className="mb-1 text-xs text-gray-400">Calories</Text>
            <TextInput
              placeholder="300"
              placeholderTextColor="#6b7280"
              className="rounded-lg bg-gray-600 px-3 py-2 text-center text-white"
              value={mealCalories}
              onChangeText={setMealCalories}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs text-gray-400">Protein (g)</Text>
            <TextInput
              placeholder="30"
              placeholderTextColor="#6b7280"
              className="rounded-lg bg-gray-600 px-3 py-2 text-center text-white"
              value={mealProtein}
              onChangeText={setMealProtein}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs text-gray-400">Carbs (g)</Text>
            <TextInput
              placeholder="40"
              placeholderTextColor="#6b7280"
              className="rounded-lg bg-gray-600 px-3 py-2 text-center text-white"
              value={mealCarbs}
              onChangeText={setMealCarbs}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs text-gray-400">Fat (g)</Text>
            <TextInput
              placeholder="10"
              placeholderTextColor="#6b7280"
              className="rounded-lg bg-gray-600 px-3 py-2 text-center text-white"
              value={mealFat}
              onChangeText={setMealFat}
              keyboardType="numeric"
            />
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
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
                <View className="flex-1">
                  <Text className="text-base text-white">{item.name}</Text>
                  <Text className="text-xs text-gray-400">
                    {item.calories || 0} kcal
                    {item.protein_g ? ` · P: ${item.protein_g}g` : ''}
                    {item.carbs_g ? ` · C: ${item.carbs_g}g` : ''}
                    {item.fat_g ? ` · F: ${item.fat_g}g` : ''}
                  </Text>
                </View>
                <Text className="mr-3 text-xs capitalize text-gray-500">{item.category}</Text>
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
