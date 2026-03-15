import "server-only";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { validateResetToken, consumeResetToken } from "@/lib/resetToken";
import { sendPasswordResetConfirmationEmail } from "@/lib/email";

const PASSWORD_REGEX = {
  minLength: 8,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_REGEX.minLength &&
    PASSWORD_REGEX.uppercase.test(password) &&
    PASSWORD_REGEX.digit.test(password) &&
    PASSWORD_REGEX.special.test(password)
  );
}

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token (obtained after OTP verification).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Token and new password are required." },
        { status: 400 }
      );
    }

    // Step 1: Validate password strength
    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character.",
        },
        { status: 400 }
      );
    }

    // Step 2: Validate reset token
    const tokenResult = await validateResetToken(token);
    if (!tokenResult.valid || !tokenResult.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired reset link. Please request a new OTP. | ಅಮಾನ್ಯ ಅಥವಾ ಅವಧಿ ಮೀರಿದ ರೀಸೆಟ್ ಲಿಂಕ್.",
        },
        { status: 400 }
      );
    }

    // Step 3: Find user by email
    const userRecord = await adminAuth.getUserByEmail(tokenResult.email);

    // Step 4: Update password via Firebase Admin SDK
    await adminAuth.updateUser(userRecord.uid, { password: newPassword });

    // Step 5: Consume the reset token (single-use)
    await consumeResetToken(token);

    // Step 6: Clear mustChangePassword flag if set
    try {
      await adminDb.collection("users").doc(userRecord.uid).update({
        mustChangePassword: false,
      });
    } catch {
      // User doc may not exist or field may not exist — non-critical
    }

    // Step 7: Send confirmation email (non-blocking)
    sendPasswordResetConfirmationEmail(tokenResult.email).catch(() => {
      // Silent fail — password was already reset
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Password reset failed: ${message}` },
      { status: 500 }
    );
  }
}
