/**
 * User service — abstracts Firestore operations for user data.
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
import type { User, StaffProfile, PrisonHead, SuperAdmin } from "@/types/user";
import type { QueryConstraint } from "firebase/firestore";

const COLLECTION = "users";

export async function getUserById(uid: string): Promise<User | null> {
  return getDocument<User>(COLLECTION, uid);
}

export async function getStaffByPrison(
  prisonId: string,
  pageSize: number = 20
): Promise<StaffProfile[]> {
  const constraints: QueryConstraint[] = [
    where("prisonId", "==", prisonId),
    where("role", "==", "STAFF"),
    orderBy("displayName"),
    limit(pageSize),
  ];
  return queryDocuments<StaffProfile>(COLLECTION, constraints);
}

export async function createUser(uid: string, data: Omit<User, "uid" | "createdAt" | "updatedAt">): Promise<void> {
  return createDocument(COLLECTION, uid, { ...data, uid });
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  return updateDocument(COLLECTION, uid, data);
}
