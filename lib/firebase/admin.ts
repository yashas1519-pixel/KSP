/**
 * Firebase Admin SDK — server-only singleton.
 * Uses lazy initialization so it doesn't crash at build time
 * when env vars aren't available yet (Vercel build phase).
 */

import "server-only";

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _adminApp: App | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    _adminApp = existing[0];
    return _adminApp;
  }

  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!base64Key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env var is required");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(base64Key, "base64").toString("utf-8")
  );

  _adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return _adminApp;
}

// Lazy getters — only initialize when actually called at runtime
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return Reflect.get(getAuth(getAdminApp()), prop);
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    return Reflect.get(getFirestore(getAdminApp()), prop);
  },
});
