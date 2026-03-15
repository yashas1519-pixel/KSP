import "server-only";

import { createHash, randomInt } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { sendOTPEmail } from "@/lib/email";
import { generateResetToken } from "@/lib/resetToken";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
const MAX_REQUESTS_PER_HOUR = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hash an OTP with email and secret salt using SHA-256.
 * Never store or compare plain OTPs.
 */
function hashOTP(otp: string, email: string): string {
  const salt = process.env.OTP_SALT;
  if (!salt) throw new Error("OTP_SALT environment variable is required");
  return createHash("sha256")
    .update(`${otp}${email}${salt}`)
    .digest("hex");
}

interface OTPDocument {
  email: string;
  otpHash: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  attempts: number;
  verified: boolean;
  ipAddress: string;
  requestCount: number;
  requestWindowStart: Timestamp;
}

/**
 * Generate a 6-digit OTP and send it via email.
 * Always returns success to prevent email enumeration attacks.
 */
export async function generateAndSendOTP(
  email: string,
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Check if email exists in Firebase Auth
    // If not, still return success (prevent enumeration)
    let emailExists = true;
    try {
      await adminAuth.getUserByEmail(email);
    } catch {
      emailExists = false;
    }

    // If email doesn't exist, return success silently
    if (!emailExists) {
      return { success: true };
    }

    // Step 2: Fetch existing OTP request doc
    const docRef = adminDb.collection("otp_requests").doc(email);
    const docSnap = await docRef.get();
    const now = Timestamp.now();
    const nowMs = now.toMillis();

    // Step 3: Check rate limit (max 5 requests per hour per email)
    if (docSnap.exists) {
      const data = docSnap.data() as OTPDocument;
      const windowStart = data.requestWindowStart.toMillis();

      if (nowMs - windowStart < RATE_WINDOW_MS) {
        if (data.requestCount >= MAX_REQUESTS_PER_HOUR) {
          return {
            success: false,
            error: "Too many requests. Try after 1 hour. | ಹಲವು ವಿನಂತಿಗಳು. 1 ಗಂಟೆ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.",
          };
        }
      }
    }

    // Step 4: Generate 6-digit OTP using crypto
    const otp = randomInt(100000, 999999).toString();

    // Step 5: Hash the OTP
    const otpHash = hashOTP(otp, email);

    // Step 6: Determine rate limit counters
    let requestCount = 1;
    let requestWindowStart: Timestamp = now;

    if (docSnap.exists) {
      const data = docSnap.data() as OTPDocument;
      const windowStart = data.requestWindowStart.toMillis();

      if (nowMs - windowStart < RATE_WINDOW_MS) {
        requestCount = data.requestCount + 1;
        requestWindowStart = data.requestWindowStart;
      }
    }

    // Save to Firestore (invalidates any previous OTP for this email)
    const expiresAt = Timestamp.fromMillis(nowMs + OTP_EXPIRY_MS);
    await docRef.set({
      email,
      otpHash,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verified: false,
      ipAddress,
      requestCount,
      requestWindowStart,
    });

    // Step 7: Send OTP email
    await sendOTPEmail(email, otp);

    // Step 8: Return success — never return the OTP
    return { success: true };
  } catch {
    // Silently handle errors — never reveal internal state
    return { success: true };
  }
}

/**
 * Verify a user-entered OTP against the stored hash.
 */
export async function verifyOTP(
  email: string,
  enteredOtp: string,
  ipAddress: string
): Promise<{
  success: boolean;
  resetToken?: string;
  error?: string;
  attemptsLeft?: number;
}> {
  try {
    const docRef = adminDb.collection("otp_requests").doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: "Invalid or expired OTP. | ಅಮಾನ್ಯ ಅಥವಾ ಅವಧಿ ಮೀರಿದ OTP." };
    }

    const data = docSnap.data() as OTPDocument;

    if (data.verified) {
      return { success: false, error: "OTP already used. Request a new one. | OTP ಈಗಾಗಲೇ ಬಳಸಲಾಗಿದೆ. ಹೊಸದನ್ನು ಕೋರಿ." };
    }

    const now = Timestamp.now();
    if (data.expiresAt.toMillis() < now.toMillis()) {
      return { success: false, error: "OTP expired. Request a new one. | OTP ಅವಧಿ ಮೀರಿದೆ. ಹೊಸದನ್ನು ಕೋರಿ." };
    }

    const newAttempts = data.attempts + 1;

    if (newAttempts > MAX_ATTEMPTS) {
      await docRef.update({ attempts: newAttempts, verified: true });
      return {
        success: false,
        error: "Too many wrong attempts. Request a new OTP. | ಹಲವು ತಪ್ಪಾದ ಪ್ರಯತ್ನಗಳು. ಹೊಸ OTP ಕೋರಿ.",
        attemptsLeft: 0,
      };
    }

    const enteredHash = hashOTP(enteredOtp, email);

    if (enteredHash !== data.otpHash) {
      await docRef.update({ attempts: newAttempts, ipAddress });
      const attemptsLeft = MAX_ATTEMPTS - newAttempts;
      return {
        success: false,
        error: `Wrong OTP. ${attemptsLeft} attempt(s) remaining. | ತಪ್ಪಾದ OTP. ${attemptsLeft} ಪ್ರಯತ್ನ(ಗಳು) ಉಳಿದಿವೆ.`,
        attemptsLeft,
      };
    }

    await docRef.update({ verified: true, attempts: newAttempts });
    const resetToken = await generateResetToken(email);

    return { success: true, resetToken };
  } catch {
    return { success: false, error: "Verification failed. Please try again. | ಪರಿಶೀಲನೆ ವಿಫಲವಾಗಿದೆ." };
  }
}
