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
import { Role } from "@/constants/roles";
import type { User, StaffProfile, PrisonHead } from "@/types/user";
import type { QueryConstraint } from "firebase/firestore";

const COLLECTION = "users";

/**
 * Fetch a single user document by UID.
 */
export async function getUserById(uid: string): Promise<User | null> {
  return getDocument<User>(COLLECTION, uid);
}

/**
 * Fetch a staff profile by UID (returns StaffProfile or null).
 */
export async function getStaffProfile(uid: string): Promise<StaffProfile | null> {
  return getDocument<StaffProfile>(COLLECTION, uid);
}

/**
 * Fetch a prison head profile by UID.
 */
export async function getPrisonHeadProfile(uid: string): Promise<PrisonHead | null> {
  return getDocument<PrisonHead>(COLLECTION, uid);
}

/**
 * Create a new staff user document.
 * The prisonId and prisonName are inherited from the Prison Head who creates them.
 */
export async function createStaffUser(
  prisonHeadUid: string,
  staffUid: string,
  data: Omit<StaffProfile, "uid" | "role" | "prisonId" | "prisonName" | "createdAt" | "updatedAt">
): Promise<void> {
  // Fetch the Prison Head's data to inherit prisonId
  const prisonHead = await getDocument<User>(COLLECTION, prisonHeadUid);

  if (!prisonHead) {
    throw new Error("Prison Head not found");
  }

  if (prisonHead.role !== Role.PRISON_HEAD) {
    throw new Error("Only Prison Heads can create staff users");
  }

  if (!prisonHead.prisonId || !prisonHead.prisonName) {
    throw new Error("Prison Head is missing prisonId or prisonName");
  }

  const staffData = {
    ...data,
    uid: staffUid,
    role: Role.STAFF,
    prisonId: prisonHead.prisonId,
    prisonName: prisonHead.prisonName,
    status: "active",
  };

  return createDocument(COLLECTION, staffUid, staffData);
}

/**
 * Update a user's profile fields.
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<StaffProfile>
): Promise<void> {
  return updateDocument(COLLECTION, uid, data);
}

/**
 * Deactivate a staff account by setting status to inactive.
 */
export async function deactivateStaffAccount(uid: string): Promise<void> {
  return updateDocument(COLLECTION, uid, { status: "inactive" });
}

/**
 * Fetch all users with PRISON_HEAD role.
 */
export async function getAllPrisonHeads(
  pageSize: number = 100
): Promise<PrisonHead[]> {
  const constraints: QueryConstraint[] = [
    where("role", "==", Role.PRISON_HEAD),
    orderBy("displayName"),
    limit(pageSize),
  ];
  return queryDocuments<PrisonHead>(COLLECTION, constraints);
}

/**
 * Deactivate a Prison Head account by setting status to inactive.
 */
export async function deactivatePrisonHead(uid: string): Promise<void> {
  return updateDocument(COLLECTION, uid, { status: "inactive" });
}

/**
 * Fetch all staff across all prisons (for Super Admin analytics).
 */
export async function getAllStaff(
  pageSize: number = 500
): Promise<StaffProfile[]> {
  const constraints: QueryConstraint[] = [
    where("role", "==", Role.STAFF),
    orderBy("fullNameEn"),
    limit(pageSize),
  ];
  return queryDocuments<StaffProfile>(COLLECTION, constraints);
}

/**
 * Fetch all staff members for a given prison.
 */
export async function getStaffByPrison(
  prisonId: string,
  pageSize: number = 50
): Promise<StaffProfile[]> {
  const constraints: QueryConstraint[] = [
    where("prisonId", "==", prisonId),
    where("role", "==", Role.STAFF),
    orderBy("fullNameEn"),
    limit(pageSize),
  ];
  return queryDocuments<StaffProfile>(COLLECTION, constraints);
}

