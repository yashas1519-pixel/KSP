/**
 * API route: POST /api/admin/create-staff
 * Creates a new staff Firebase Auth user + Firestore doc.
 *
 * Security:
 * 1. Verifies Firebase Auth ID token from Authorization header
 * 2. Fetches caller's user doc and verifies role is PRISON_HEAD or SUPER_ADMIN
 * 3. PRISON_HEAD can only create staff in their own prison (prisonId enforced server-side)
 */

import "server-only";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  getDocument,
  createDocument,
} from "@/lib/firebase/firestore";
import { Role } from "@/constants/roles";
import { apiRateLimiter, getClientIP } from "@/lib/rate-limit";
import type { User } from "@/types/user";

export async function POST(request: Request) {
  try {
    // Rate limit check
    const ip = getClientIP(request);
    const rl = apiRateLimiter.check(`create-staff:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetInMs / 1000)) } }
      );
    }

    // ── Step 1: Verify Firebase Auth ID token ──────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    if (!idToken) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Verify the token with Firebase Admin (not just trusting the UID)
    let callerUid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    // ── Step 2: Fetch caller's user doc and verify role ───────
    const callerDoc = await getDocument<User>("users", callerUid);
    if (!callerDoc) {
      return NextResponse.json(
        { error: "Caller user profile not found" },
        { status: 403 }
      );
    }

    const allowedRoles: Role[] = [Role.PRISON_HEAD, Role.SUPER_ADMIN];
    if (!allowedRoles.includes(callerDoc.role)) {
      return NextResponse.json(
        { error: "Forbidden: only Prison Heads and Super Admins can create staff" },
        { status: 403 }
      );
    }

    // ── Step 3: Parse and validate request body ───────────────
    const body = await request.json();
    const { fullNameEn, fullNameKn, email, badgeNumber, rank, dutyType } = body;

    if (!fullNameEn || !fullNameKn || !email || !badgeNumber || !rank || !dutyType) {
      return NextResponse.json(
        { error: "Missing required fields: fullNameEn, fullNameKn, email, badgeNumber, rank, dutyType" },
        { status: 400 }
      );
    }

    // ── Step 4: Enforce prisonId from caller (no spoofing) ────
    // PRISON_HEAD: prisonId comes from their own profile, not from request
    // SUPER_ADMIN: must provide prisonId in the request body
    let prisonId: string;
    let prisonName: string;

    if (callerDoc.role === Role.PRISON_HEAD) {
      if (!callerDoc.prisonId || !callerDoc.prisonName) {
        return NextResponse.json(
          { error: "Prison Head profile is missing prisonId" },
          { status: 400 }
        );
      }
      // Always use the Prison Head's own prisonId — ignore any prisonId in request body
      prisonId = callerDoc.prisonId;
      prisonName = callerDoc.prisonName;
    } else {
      // SUPER_ADMIN must specify which prison
      if (!body.prisonId || !body.prisonName) {
        return NextResponse.json(
          { error: "Super Admin must provide prisonId and prisonName" },
          { status: 400 }
        );
      }
      prisonId = body.prisonId;
      prisonName = body.prisonName;
    }

    // ── Step 5: Create Firebase Auth user ─────────────────────
    const tempPassword = crypto.randomUUID().slice(0, 12);

    const newUser = await adminAuth.createUser({
      email,
      password: tempPassword,
      displayName: fullNameEn,
    });

    // ── Step 6: Create Firestore user document ────────────────
    await createDocument("users", newUser.uid, {
      uid: newUser.uid,
      email,
      displayName: fullNameEn,
      role: Role.STAFF,
      prisonId,
      prisonName,
      badgeNumber,
      rank,
      dutyType,
      fullNameEn,
      fullNameKn,
      status: "active",
      profileComplete: false,
      existingConditions: [],
      achievements: [],
    });

    // ── Step 7: Send password reset email so staff sets own password ──
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    return NextResponse.json({
      success: true,
      uid: newUser.uid,
      email,
      resetLink,
      tempPasswordSent: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create staff account: ${message}` },
      { status: 500 }
    );
  }
}
