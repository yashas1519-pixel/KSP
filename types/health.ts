import { BMICategory } from "@/constants/bmi";

export interface HealthRecord {
  id: string;
  userId: string;
  date: Date;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiCategory: BMICategory;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthSummary {
  userId: string;
  latestBmi: number;
  latestBmiCategory: BMICategory;
  latestWeight: number;
  bmiTrend: "improving" | "stable" | "declining";
  totalRecords: number;
  lastCheckupDate: Date;
}
