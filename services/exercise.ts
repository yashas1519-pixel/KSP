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
import { checkPlanApprovedAlert } from "@/lib/monitoring";

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

/**
 * Fetch all pending exercise plans for staff belonging to a prison.
 * Requires the caller to pass the list of staff UIDs for this prison.
 */
export async function getPendingExercisePlans(
  staffUids: string[]
): Promise<StoredExercisePlan[]> {
  if (staffUids.length === 0) return [];

  const results: StoredExercisePlan[] = [];
  const chunks = chunkArray(staffUids, 30);

  for (const chunk of chunks) {
    const constraints: QueryConstraint[] = [
      where("userId", "in", chunk),
      where("status", "==", "pending_approval"),
      orderBy("generatedAt", "desc"),
    ];
    const docs = await queryDocuments<StoredExercisePlan>(COLLECTION, constraints);
    results.push(...docs);
  }

  return results;
}

/**
 * Approve an exercise plan.
 */
export async function approveExercisePlan(
  planId: string,
  approvedByUid: string
): Promise<void> {
  const plan = await getExercisePlan(planId);
  await updateDocument(COLLECTION, planId, {
    status: "approved",
    approvedBy: approvedByUid,
    approvedAt: new Date(),
  });
  if (plan?.userId) {
    await checkPlanApprovedAlert(plan.userId, "exercise");
  }
}

/**
 * Reject an exercise plan with a reason.
 */
export async function rejectExercisePlan(
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
