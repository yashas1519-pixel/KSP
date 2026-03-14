/**
 * Exercise service — abstracts Firestore operations for exercise plans and logs.
 */

import {
  getDocument,
  queryDocuments,
  createDocument,
  updateDocument,
  where,
  orderBy,
  limit,
} from "@/lib/firebase/firestore";
import type { ExercisePlan, ExerciseLog } from "@/types/exercise";
import type { QueryConstraint } from "firebase/firestore";

const PLANS_COLLECTION = "exercisePlans";
const LOGS_COLLECTION = "exerciseLogs";

export async function getExercisePlan(id: string): Promise<ExercisePlan | null> {
  return getDocument<ExercisePlan>(PLANS_COLLECTION, id);
}

export async function getExercisePlansByUser(
  userId: string,
  pageSize: number = 20
): Promise<ExercisePlan[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("generatedAt", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<ExercisePlan>(PLANS_COLLECTION, constraints);
}

export async function createExercisePlan(
  id: string,
  data: Omit<ExercisePlan, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(PLANS_COLLECTION, id, { ...data, id });
}

export async function updateExercisePlan(
  id: string,
  data: Partial<ExercisePlan>
): Promise<void> {
  return updateDocument(PLANS_COLLECTION, id, data);
}

export async function getExerciseLogsByUser(
  userId: string,
  pageSize: number = 20
): Promise<ExerciseLog[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<ExerciseLog>(LOGS_COLLECTION, constraints);
}

export async function createExerciseLog(
  id: string,
  data: Omit<ExerciseLog, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(LOGS_COLLECTION, id, { ...data, id });
}
