import { BMICategory } from "@/constants/bmi";
import type { PlanStatus } from "./diet";

// ─── Exercise Plan Input (sent to Claude) ───────────────────────────

export interface ExercisePlanInput {
  uid: string;
  bmiCategory: BMICategory;
  ageYears: number;
  gender: string;
  dutyType: "field" | "administrative";
  existingConditions: string[];
}

// ─── Exercise Plan Output (returned from Claude) ────────────────────

export interface ExerciseItem {
  nameEn: string;
  nameKn: string;
  sets: number;
  reps: string;
  durationMinutes: number;
  notes: string;
}

export interface ExerciseDay {
  day: string;
  dayKn: string;
  focus: string;
  focusKn: string;
  exercises: ExerciseItem[];
  totalDurationMinutes: number;
  restDay: boolean;
}

export interface ExercisePlanOutput {
  weeklyPlan: ExerciseDay[];
  weeklyNotes: {
    en: string;
    kn: string;
  };
}

// ─── Stored in Firestore ────────────────────────────────────────────

export interface StoredExercisePlan {
  id: string;
  userId: string;
  plan: ExercisePlanOutput;
  status: PlanStatus;
  generatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
