import "server-only";

import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

interface ResetTokenDocument {
  email: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
}

/**
 * Generate a single-use reset token tied to an email.
 * Token is stored in Firestore and expires in 15 minutes.
 */
export async function generateResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + RESET_TOKEN_EXPIRY_MS);

  await adminDb.collection("password_reset_tokens").doc(token).set({
    email,
    createdAt: now,
    expiresAt,
    used: false,
  });

  return token;
}

/**
 * Validate a reset token — check it exists, is not used, and is not expired.
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  try {
    const docRef = adminDb.collection("password_reset_tokens").doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { valid: false };
    }

    const data = docSnap.data() as ResetTokenDocument;

    if (data.used) {
      return { valid: false };
    }

    const now = Timestamp.now();
    if (data.expiresAt.toMillis() < now.toMillis()) {
      return { valid: false };
    }

    return { valid: true, email: data.email };
  } catch {
    return { valid: false };
  }
}

/**
 * Consume a reset token — marks it as used so it cannot be reused.
 */
export async function consumeResetToken(token: string): Promise<void> {
  await adminDb.collection("password_reset_tokens").doc(token).update({
    used: true,
  });
}
