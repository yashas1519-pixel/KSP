/**
 * Prison service — Firestore operations for prison documents.
 */

import {
  getDocument,
  queryDocuments,
  createDocument,
  updateDocument,
  orderBy,
  limit,
} from "@/lib/firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";

export interface Prison {
  prisonId: string;
  prisonName: string;
  prisonNameKn: string;
  district: string;
  districtKn: string;
  headUid?: string;
  totalStaff: number;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = "prisons";

export async function createPrison(
  data: Omit<Prison, "createdAt" | "updatedAt">
): Promise<void> {
  return createDocument(COLLECTION, data.prisonId, data);
}

export async function getAllPrisons(
  pageSize: number = 100
): Promise<Prison[]> {
  const constraints: QueryConstraint[] = [
    orderBy("prisonName"),
    limit(pageSize),
  ];
  return queryDocuments<Prison>(COLLECTION, constraints);
}

export async function getPrisonById(
  prisonId: string
): Promise<Prison | null> {
  return getDocument<Prison>(COLLECTION, prisonId);
}

export async function updatePrison(
  prisonId: string,
  data: Partial<Prison>
): Promise<void> {
  return updateDocument(COLLECTION, prisonId, data);
}
