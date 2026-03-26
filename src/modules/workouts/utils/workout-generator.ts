import { getExercisesByMuscle } from '~/src/modules/exercises/api/exercises';

interface GenerateOptions {
  targetMuscles: string[];
  equipment: string[];
  exercisesPerMuscle?: number;
  primaryWeight?: number;
  secondaryWeight?: number;
}

/**
 * Weighted workout generator ported from Workout.cool.
 * 70% primary muscle exercises, 30% secondary -- Fisher-Yates shuffle.
 */
export async function generateWorkout(options: GenerateOptions) {
  const {
    targetMuscles,
    equipment,
    exercisesPerMuscle = 3,
    primaryWeight = 0.7,
    secondaryWeight = 0.3,
  } = options;

  const allExercises: any[] = [];

  for (const muscle of targetMuscles) {
    // Fetch primary muscle exercises
    const { data: primary } = await getExercisesByMuscle(muscle, equipment, {
      includePrimary: true,
      includeSecondary: false,
      limit: 50,
    });

    // Fetch secondary muscle exercises
    const { data: secondary } = await getExercisesByMuscle(muscle, equipment, {
      includePrimary: false,
      includeSecondary: true,
      limit: 30,
    });

    const primaryList = primary || [];
    const secondaryList = secondary || [];

    // Weighted selection
    const selected = weightedSelect(
      primaryList,
      secondaryList,
      exercisesPerMuscle,
      primaryWeight,
      secondaryWeight
    );

    // Deduplicate against already selected exercises
    for (const exercise of selected) {
      if (!allExercises.find((e) => e.id === exercise.id)) {
        allExercises.push(exercise);
      }
    }
  }

  return fisherYatesShuffle(allExercises);
}

function weightedSelect(
  primary: any[],
  secondary: any[],
  count: number,
  primaryWeight: number,
  secondaryWeight: number
): any[] {
  const shuffledPrimary = fisherYatesShuffle([...primary]);
  const shuffledSecondary = fisherYatesShuffle([...secondary]);

  const result: any[] = [];
  const primaryCount = Math.ceil(count * primaryWeight);
  const secondaryCount = count - primaryCount;

  // Take from primary
  for (let i = 0; i < primaryCount && i < shuffledPrimary.length; i++) {
    result.push(shuffledPrimary[i]);
  }

  // Fill remaining from secondary
  for (let i = 0; i < secondaryCount && i < shuffledSecondary.length; i++) {
    if (!result.find((e) => e.id === shuffledSecondary[i].id)) {
      result.push(shuffledSecondary[i]);
    }
  }

  // If we still don't have enough, fill from remaining primary
  if (result.length < count) {
    for (let i = primaryCount; i < shuffledPrimary.length && result.length < count; i++) {
      if (!result.find((e) => e.id === shuffledPrimary[i].id)) {
        result.push(shuffledPrimary[i]);
      }
    }
  }

  return result;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
