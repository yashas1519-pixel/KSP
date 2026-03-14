export interface DietPlan {
  id: string;
  userId: string;
  generatedAt: Date;
  status: "pending" | "approved" | "active" | "archived";
  totalCalories: number;
  meals: Meal[];
  notes?: string;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meal {
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  items: MealItem[];
  totalCalories: number;
}

export interface MealItem {
  name: string;
  quantity: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface DietGenerationRequest {
  userId: string;
  bmi: number;
  weightKg: number;
  heightCm: number;
  dietaryPreferences?: string[];
  allergies?: string[];
  goal: "lose_weight" | "maintain" | "gain_weight";
}
