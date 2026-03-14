/**
 * Firebase Admin SDK — server-only singleton.
 * Decodes the base64-encoded service account from FIREBASE_SERVICE_ACCOUNT_KEY.
 */

import "server-only";

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!base64Key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env var is required");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(base64Key, "base64").toString("utf-8")
  );

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const adminApp: App = getAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
