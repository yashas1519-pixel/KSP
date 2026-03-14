/**
 * Notification service — Firestore operations for alerts.
 * Uses subcollection pattern: /notifications/{uid}/alerts/{alertId}
 */

import {
  db,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
} from "@/lib/firebase/firestore";
import {
  getDocs,
  setDoc,
  updateDoc,
  getCountFromServer,
  type QueryConstraint,
} from "firebase/firestore";
import type { AlertType, NotificationAlert } from "@/types/notification";

function alertsCollection(uid: string) {
  return collection(db, "notifications", uid, "alerts");
}

/**
 * Create a new notification alert for a user.
 */
export async function createAlert(
  uid: string,
  type: AlertType,
  messageEn: string,
  messageKn: string
): Promise<string> {
  const id = crypto.randomUUID();
  const alertRef = doc(alertsCollection(uid), id);
  const now = new Date();

  await setDoc(alertRef, {
    id,
    userId: uid,
    type,
    messageEn,
    messageKn,
    read: false,
    createdAt: now,
  });

  return id;
}

/**
 * Fetch recent alerts for a user.
 */
export async function getAlerts(
  uid: string,
  pageSize: number = 10
): Promise<NotificationAlert[]> {
  const constraints: QueryConstraint[] = [
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];

  const q = query(alertsCollection(uid), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as unknown as NotificationAlert
  );
}

/**
 * Mark a single alert as read.
 */
export async function markAlertRead(
  uid: string,
  alertId: string
): Promise<void> {
  const alertRef = doc(alertsCollection(uid), alertId);
  await updateDoc(alertRef, { read: true });
}

/**
 * Get count of unread alerts for a user.
 */
export async function getUnreadCount(uid: string): Promise<number> {
  const q = query(alertsCollection(uid), where("read", "==", false));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}
