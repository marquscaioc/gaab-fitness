interface SetData {
  weight?: number | null;
  reps?: number | null;
  completed: boolean;
}

export function setVolume(set: SetData): number {
  if (!set.completed || !set.weight || !set.reps) return 0;
  return set.weight * set.reps;
}

export function totalVolume(sets: SetData[]): number {
  return sets.reduce((sum, set) => sum + setVolume(set), 0);
}

export function completedSetsCount(sets: SetData[]): number {
  return sets.filter((s) => s.completed).length;
}

export function totalReps(sets: SetData[]): number {
  return sets.reduce((sum, s) => sum + (s.completed && s.reps ? s.reps : 0), 0);
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
