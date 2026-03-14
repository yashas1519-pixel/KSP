/**
 * Exercise service — abstracts Firestore operations for exercise plans.
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
import type { StoredExercisePlan } from "@/types/exercise";
import type { QueryConstraint } from "firebase/firestore";

const COLLECTION = "exercise_plans";

export async function getExercisePlan(id: string): Promise<StoredExercisePlan | null> {
  return getDocument<StoredExercisePlan>(COLLECTION, id);
}

export async function getExercisePlansByUser(
  userId: string,
  pageSize: number = 20
): Promise<StoredExercisePlan[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("generatedAt", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<StoredExercisePlan>(COLLECTION, constraints);
}

export async function createExercisePlan(
  id: string,
  data: Omit<StoredExercisePlan, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(COLLECTION, id, { ...data, id });
}

export async function updateExercisePlan(
  id: string,
  data: Partial<StoredExercisePlan>
): Promise<void> {
  return updateDocument(COLLECTION, id, data);
}
