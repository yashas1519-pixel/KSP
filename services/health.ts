/**
 * Health service — abstracts Firestore operations for health records.
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
import type { HealthRecord, HealthSummary } from "@/types/health";
import type { QueryConstraint } from "firebase/firestore";

const COLLECTION = "healthRecords";

export async function getHealthRecord(id: string): Promise<HealthRecord | null> {
  return getDocument<HealthRecord>(COLLECTION, id);
}

export async function getHealthRecordsByUser(
  userId: string,
  pageSize: number = 20
): Promise<HealthRecord[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(pageSize),
  ];
  return queryDocuments<HealthRecord>(COLLECTION, constraints);
}

export async function createHealthRecord(
  id: string,
  data: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(COLLECTION, id, { ...data, id });
}

export async function updateHealthRecord(
  id: string,
  data: Partial<HealthRecord>
): Promise<void> {
  return updateDocument(COLLECTION, id, data);
}
