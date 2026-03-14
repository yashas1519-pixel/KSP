/**
 * Diet service — abstracts Firestore operations for diet plans.
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
import type { DietPlan } from "@/types/diet";
import type { QueryConstraint } from "firebase/firestore";

const COLLECTION = "dietPlans";

export async function getDietPlan(id: string): Promise<DietPlan | null> {
  return getDocument<DietPlan>(COLLECTION, id);
}

export async function getDietPlansByUser(
  userId: string,
  pageSize: number = 20
): Promise<DietPlan[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("generatedAt", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<DietPlan>(COLLECTION, constraints);
}

export async function createDietPlan(
  id: string,
  data: Omit<DietPlan, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(COLLECTION, id, { ...data, id });
}

export async function updateDietPlan(
  id: string,
  data: Partial<DietPlan>
): Promise<void> {
  return updateDocument(COLLECTION, id, data);
}
