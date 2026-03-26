export type Workout = {
  id: number;
  name: string;
  description: string;
  instructions: string;
  category: string;
  exercises: Exercise[];
};

export type Exercise = {
  id?: number;
  workout_id: string;
  name: string;
  sets: string;
  instructions: string;
  description: string;
};
