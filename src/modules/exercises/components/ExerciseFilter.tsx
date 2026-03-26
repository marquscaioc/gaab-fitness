import { View, Text, ScrollView, Pressable } from 'react-native';

import { useExerciseFilterStore } from '../store/exerciseFilterStore';

interface ChipGroupProps {
  title: string;
  items: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
  color: 'green' | 'blue' | 'purple';
}

const colorMap = {
  green: { bg: 'bg-green-700', bgInactive: 'bg-gray-700', text: 'text-green-100' },
  blue: { bg: 'bg-blue-700', bgInactive: 'bg-gray-700', text: 'text-blue-100' },
  purple: { bg: 'bg-purple-700', bgInactive: 'bg-gray-700', text: 'text-purple-100' },
};

function ChipGroup({ title, items, selected, onToggle, color }: ChipGroupProps) {
  const c = colorMap[color];
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-gray-400">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {items.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <Pressable
                key={item}
                onPress={() => onToggle(item)}
                className={`rounded-full px-3 py-1.5 ${isSelected ? c.bg : c.bgInactive}`}>
                <Text className={`text-xs capitalize ${isSelected ? 'font-bold text-white' : 'text-gray-400'}`}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

interface ExerciseFilterProps {
  muscles: readonly string[];
  equipment: readonly string[];
  bodyParts: readonly string[];
}

export default function ExerciseFilter({ muscles, equipment, bodyParts }: ExerciseFilterProps) {
  const store = useExerciseFilterStore();

  const hasFilters =
    store.selectedMuscles.length > 0 ||
    store.selectedEquipment.length > 0 ||
    store.selectedBodyParts.length > 0;

  return (
    <View className="px-4 pb-2">
      <ChipGroup
        title="Muscles"
        items={muscles}
        selected={store.selectedMuscles}
        onToggle={store.toggleMuscle}
        color="green"
      />
      <ChipGroup
        title="Equipment"
        items={equipment}
        selected={store.selectedEquipment}
        onToggle={store.toggleEquipment}
        color="blue"
      />
      <ChipGroup
        title="Body Parts"
        items={bodyParts}
        selected={store.selectedBodyParts}
        onToggle={store.toggleBodyPart}
        color="purple"
      />
      {hasFilters && (
        <Pressable onPress={store.clearFilters} className="self-start rounded-lg bg-red-900 px-3 py-1.5">
          <Text className="text-xs font-semibold text-red-300">Clear Filters</Text>
        </Pressable>
      )}
    </View>
  );
}
