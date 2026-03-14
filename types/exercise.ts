export interface ExercisePlan {
  id: string;
  userId: string;
  generatedAt: Date;
  status: "pending" | "approved" | "active" | "archived";
  exercises: Exercise[];
  durationMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  notes?: string;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  name: string;
  type: "cardio" | "strength" | "flexibility" | "balance";
  sets?: number;
  reps?: number;
  durationMinutes?: number;
  caloriesBurned?: number;
  instructions?: string;
}

export interface ExerciseLog {
  id: string;
  userId: string;
  exercisePlanId: string;
  date: Date;
  completed: boolean;
  exercisesCompleted: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
