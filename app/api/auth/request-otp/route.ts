import "server-only";

import { NextResponse } from "next/server";
import { generateAndSendOTP } from "@/lib/otp";
import { getClientIP } from "@/lib/rate-limit";

// In-memory rate limiter: 5 requests per IP per hour
const ipRequestCounts = new Map<string, { count: number; windowStart: number }>();
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_REQUESTS = 5;

function checkIPRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    ipRequestCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= IP_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/auth/request-otp
 * Request a password reset OTP. Always returns 200 to prevent email enumeration.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);

    // IP-based rate limit
    if (!checkIPRateLimit(ip)) {
      // Still return 200 to prevent information leakage
      return NextResponse.json({ success: true });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: true });
    }

    const result = await generateAndSendOTP(email.toLowerCase().trim(), ip);

    // If rate-limited by email, return the error
    if (!result.success && result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 429 }
      );
    }

    // Always return success (anti-enumeration)
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
