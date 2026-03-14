import { BMICategory } from "@/constants/bmi";

// ─── Diet Plan Input (sent to Claude) ───────────────────────────────

export interface DietPlanInput {
  uid: string;
  bmiCategory: BMICategory;
  dietPreference: "veg" | "non_veg";
  ageYears: number;
  gender: string;
  dutyType: "field" | "administrative";
  existingConditions: string[];
  language: "en" | "kn";
}

// ─── Diet Plan Output (returned from Claude) ───────────────────────

export interface DietFoodItem {
  nameEn: string;
  nameKn: string;
  portion: string;
  calories: number;
}

export interface DietMeal {
  items: DietFoodItem[];
  totalCalories: number;
}

export interface DietDay {
  day: string;
  dayKn: string;
  breakfast: DietMeal;
  lunch: DietMeal;
  dinner: DietMeal;
  dailyTotalCalories: number;
}

export interface DietPlanOutput {
  weeklyPlan: DietDay[];
  dailyWaterLitres: number;
  weeklyCalorieTarget: number;
  nutritionNotes: {
    en: string;
    kn: string;
  };
}

// ─── Stored in Firestore ────────────────────────────────────────────

export type PlanStatus = "pending_approval" | "approved" | "active" | "archived";

export interface StoredDietPlan {
  id: string;
  userId: string;
  plan: DietPlanOutput;
  status: PlanStatus;
  generatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
