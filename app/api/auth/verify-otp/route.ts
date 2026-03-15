import "server-only";

import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otp";
import { getClientIP } from "@/lib/rate-limit";

// In-memory rate limiter: 10 requests per IP per hour
const ipVerifyCounts = new Map<string, { count: number; windowStart: number }>();
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_VERIFY = 10;

function checkIPRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipVerifyCounts.get(ip);

  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipVerifyCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= IP_MAX_VERIFY) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/auth/verify-otp
 * Verify a user-entered OTP and return a reset token on success.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);

    if (!checkIPRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Try again later. | ಹಲವು ವಿನಂತಿಗಳು. ನಂತರ ಪ್ರಯತ್ನಿಸಿ." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp || typeof email !== "string" || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required." },
        { status: 400 }
      );
    }

    const result = await verifyOTP(email.toLowerCase().trim(), otp.trim(), ip);

    if (result.success) {
      return NextResponse.json({
        success: true,
        resetToken: result.resetToken,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        attemptsLeft: result.attemptsLeft,
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Verification failed." },
      { status: 500 }
    );
  }
}
