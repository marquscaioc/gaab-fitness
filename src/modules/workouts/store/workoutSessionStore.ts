import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '~/src/shared/lib/mmkv';

export interface WorkoutSet {
  id: string;
  setIndex: number;
  setType: 'normal' | 'warmup' | 'dropset' | 'failure' | 'rest_pause';
  weight: number | null;
  weightUnit: 'kg' | 'lbs';
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
  completed: boolean;
  rpe: number | null;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  sets: WorkoutSet[];
}

export interface ActiveSession {
  id: string;
  templateId: string | null;
  name: string;
  startedAt: string;
  exercises: SessionExercise[];
}

interface WorkoutSessionState {
  activeSession: ActiveSession | null;
  isTimerRunning: boolean;
  elapsedSeconds: number;

  // Session lifecycle
  startSession: (params: {
    name: string;
    templateId?: string;
    exercises: { exerciseId: string; exerciseName: string; defaultSets?: number }[];
  }) => void;
  finishSession: () => ActiveSession | null;
  discardSession: () => void;

  // Exercise management
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;

  // Set management
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  updateSet: (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => void;
  completeSet: (exerciseId: string, setIndex: number) => void;

  // Timer
  tick: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultSet(index: number, weightUnit: 'kg' | 'lbs' = 'kg'): WorkoutSet {
  return {
    id: generateId(),
    setIndex: index,
    setType: 'normal',
    weight: null,
    weightUnit,
    reps: null,
    durationS: null,
    distanceM: null,
    completed: false,
    rpe: null,
  };
}

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      isTimerRunning: false,
      elapsedSeconds: 0,

      startSession: ({ name, templateId, exercises }) => {
        const sessionExercises: SessionExercise[] = exercises.map((ex, i) => ({
          id: generateId(),
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sortOrder: i,
          sets: Array.from({ length: ex.defaultSets || 3 }, (_, j) => createDefaultSet(j)),
        }));

        set({
          activeSession: {
            id: generateId(),
            templateId: templateId || null,
            name,
            startedAt: new Date().toISOString(),
            exercises: sessionExercises,
          },
          isTimerRunning: true,
          elapsedSeconds: 0,
        });
      },

      finishSession: () => {
        const session = get().activeSession;
        set({ activeSession: null, isTimerRunning: false, elapsedSeconds: 0 });
        return session;
      },

      discardSession: () => {
        set({ activeSession: null, isTimerRunning: false, elapsedSeconds: 0 });
      },

      addExercise: (exerciseId, exerciseName) => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            exercises: [
              ...session.exercises,
              {
                id: generateId(),
                exerciseId,
                exerciseName,
                sortOrder: session.exercises.length,
                sets: [createDefaultSet(0), createDefaultSet(1), createDefaultSet(2)],
              },
            ],
          },
        });
      },

      removeExercise: (exerciseId) => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            exercises: session.exercises
              .filter((e) => e.exerciseId !== exerciseId)
              .map((e, i) => ({ ...e, sortOrder: i })),
          },
        });
      },

      addSet: (exerciseId) => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            exercises: session.exercises.map((ex) =>
              ex.exerciseId === exerciseId
                ? { ...ex, sets: [...ex.sets, createDefaultSet(ex.sets.length)] }
                : ex
            ),
          },
        });
      },

      removeSet: (exerciseId, setIndex) => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            exercises: session.exercises.map((ex) =>
              ex.exerciseId === exerciseId
                ? {
                    ...ex,
                    sets: ex.sets
                      .filter((s) => s.setIndex !== setIndex)
                      .map((s, i) => ({ ...s, setIndex: i })),
                  }
                : ex
            ),
          },
        });
      },

      updateSet: (exerciseId, setIndex, data) => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            exercises: session.exercises.map((ex) =>
              ex.exerciseId === exerciseId
                ? {
                    ...ex,
                    sets: ex.sets.map((s) =>
                      s.setIndex === setIndex ? { ...s, ...data } : s
                    ),
                  }
                : ex
            ),
          },
        });
      },

      completeSet: (exerciseId, setIndex) => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            exercises: session.exercises.map((ex) =>
              ex.exerciseId === exerciseId
                ? {
                    ...ex,
                    sets: ex.sets.map((s) =>
                      s.setIndex === setIndex ? { ...s, completed: !s.completed } : s
                    ),
                  }
                : ex
            ),
          },
        });
      },

      tick: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
      toggleTimer: () => set((state) => ({ isTimerRunning: !state.isTimerRunning })),
      resetTimer: () => set({ elapsedSeconds: 0 }),
    }),
    {
      name: 'workout-session',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        elapsedSeconds: state.elapsedSeconds,
        isTimerRunning: state.isTimerRunning,
      }),
    }
  )
);
