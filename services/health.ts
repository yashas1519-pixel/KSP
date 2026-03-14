/**
 * Health service — abstracts Firestore operations for health logs.
 */

import {
  queryDocuments,
  createDocument,
  where,
  orderBy,
  limit,
} from "@/lib/firebase/firestore";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";
import { BMICategory } from "@/constants/bmi";
import { checkBMIAlerts } from "@/lib/monitoring";
import type { QueryConstraint } from "firebase/firestore";

export interface HealthLog {
  id: string;
  userId: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiCategory: BMICategory;
  waistCm?: number;
  notes?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "health_logs";

/**
 * Create a new health log entry.
 * Automatically calculates BMI and category from weight and height.
 * Triggers BMI alerts if category is concerning.
 */
export async function createHealthLog(
  userId: string,
  weightKg: number,
  heightCm: number,
  notes?: string,
  waistCm?: number
): Promise<string> {
  const bmi = calculateBMI(weightKg, heightCm);
  const bmiCategory = classifyBMI(bmi);
  const id = crypto.randomUUID();

  await createDocument(COLLECTION, id, {
    id,
    userId,
    weightKg,
    heightCm,
    bmi,
    bmiCategory,
    waistCm,
    notes,
    timestamp: new Date(),
  });

  // Fire BMI alert if weight is concerning
  await checkBMIAlerts(userId, bmiCategory);

  return id;
}

/**
 * Fetch all health logs for a user, ordered by most recent first.
 */
export async function getHealthLogs(
  userId: string,
  pageSize: number = 50
): Promise<HealthLog[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<HealthLog>(COLLECTION, constraints);
}

/**
 * Fetch only the most recent health log for a user.
 */
export async function getLatestHealthLog(
  userId: string
): Promise<HealthLog | null> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(1),
  ];
  const results = await queryDocuments<HealthLog>(COLLECTION, constraints);
  return results.length > 0 ? results[0] : null;
}
