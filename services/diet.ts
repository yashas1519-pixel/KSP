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
import type { StoredDietPlan } from "@/types/diet";
import type { QueryConstraint } from "firebase/firestore";

const COLLECTION = "diet_plans";

export async function getDietPlan(id: string): Promise<StoredDietPlan | null> {
  return getDocument<StoredDietPlan>(COLLECTION, id);
}

export async function getDietPlansByUser(
  userId: string,
  pageSize: number = 20
): Promise<StoredDietPlan[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("generatedAt", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<StoredDietPlan>(COLLECTION, constraints);
}

export async function createDietPlan(
  id: string,
  data: Omit<StoredDietPlan, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(COLLECTION, id, { ...data, id });
}

export async function updateDietPlan(
  id: string,
  data: Partial<StoredDietPlan>
): Promise<void> {
  return updateDocument(COLLECTION, id, data);
}
