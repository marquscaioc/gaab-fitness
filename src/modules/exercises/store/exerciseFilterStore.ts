import { create } from 'zustand';

interface ExerciseFilterState {
  selectedMuscles: string[];
  selectedEquipment: string[];
  selectedBodyParts: string[];
  searchQuery: string;
  toggleMuscle: (muscle: string) => void;
  toggleEquipment: (equipment: string) => void;
  toggleBodyPart: (bodyPart: string) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
}

export const useExerciseFilterStore = create<ExerciseFilterState>((set) => ({
  selectedMuscles: [],
  selectedEquipment: [],
  selectedBodyParts: [],
  searchQuery: '',

  toggleMuscle: (muscle) =>
    set((state) => ({
      selectedMuscles: state.selectedMuscles.includes(muscle)
        ? state.selectedMuscles.filter((m) => m !== muscle)
        : [...state.selectedMuscles, muscle],
    })),

  toggleEquipment: (equipment) =>
    set((state) => ({
      selectedEquipment: state.selectedEquipment.includes(equipment)
        ? state.selectedEquipment.filter((e) => e !== equipment)
        : [...state.selectedEquipment, equipment],
    })),

  toggleBodyPart: (bodyPart) =>
    set((state) => ({
      selectedBodyParts: state.selectedBodyParts.includes(bodyPart)
        ? state.selectedBodyParts.filter((b) => b !== bodyPart)
        : [...state.selectedBodyParts, bodyPart],
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearFilters: () =>
    set({
      selectedMuscles: [],
      selectedEquipment: [],
      selectedBodyParts: [],
      searchQuery: '',
    }),
}));
