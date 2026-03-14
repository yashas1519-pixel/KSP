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

/**
 * Fetch all pending diet plans for staff belonging to a prison.
 * Requires the caller to pass the list of staff UIDs for this prison.
 */
export async function getPendingDietPlans(
  staffUids: string[]
): Promise<StoredDietPlan[]> {
  if (staffUids.length === 0) return [];

  // Firestore 'in' queries support max 30 values — chunk if needed
  const results: StoredDietPlan[] = [];
  const chunks = chunkArray(staffUids, 30);

  for (const chunk of chunks) {
    const constraints: QueryConstraint[] = [
      where("userId", "in", chunk),
      where("status", "==", "pending_approval"),
      orderBy("generatedAt", "desc"),
    ];
    const docs = await queryDocuments<StoredDietPlan>(COLLECTION, constraints);
    results.push(...docs);
  }

  return results;
}

/**
 * Approve a diet plan.
 */
export async function approveDietPlan(
  planId: string,
  approvedByUid: string
): Promise<void> {
  return updateDocument(COLLECTION, planId, {
    status: "approved",
    approvedBy: approvedByUid,
    approvedAt: new Date(),
  });
}

/**
 * Reject a diet plan with a reason.
 */
export async function rejectDietPlan(
  planId: string,
  reason: string
): Promise<void> {
  return updateDocument(COLLECTION, planId, {
    status: "rejected",
    rejectionReason: reason,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
