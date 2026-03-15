/**
 * API route: POST /api/admin/create-prison-head
 * Creates a new Prison Head Firebase Auth user + Firestore doc.
 *
 * Security:
 * 1. Verifies Firebase Auth ID token
 * 2. Only SUPER_ADMIN can access
 * 3. prisonId comes from the selected prison doc, never from arbitrary input
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
import { generatePassword } from "@/lib/utils/password";
import { sendWelcomeEmail } from "@/lib/email";
import type { User } from "@/types/user";
import { getPrisonById, updatePrison } from "@/services/prisons";

export async function POST(request: Request) {
  try {
    // Rate limit check
    const ip = getClientIP(request);
    const rl = apiRateLimiter.check(`create-head:${ip}`);
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

    // ── Step 2: Verify SUPER_ADMIN role ───────────────────────
    const callerDoc = await getDocument<User>("users", callerUid);
    if (!callerDoc || callerDoc.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: only Super Admins can create Prison Heads" },
        { status: 403 }
      );
    }

    // ── Step 3: Parse and validate request body ───────────────
    const body = await request.json();
    const {
      fullName,
      fullNameKn,
      email,
      prisonId,
      badgeNumber,
      rank,
      designation,
    } = body;

    if (!fullName || !fullNameKn || !email || !prisonId || !badgeNumber || !designation) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── Step 4: Verify prison exists ──────────────────────────
    const prison = await getPrisonById(prisonId);
    if (!prison) {
      return NextResponse.json(
        { error: `Prison with ID '${prisonId}' does not exist` },
        { status: 400 }
      );
    }

    // ── Step 5: Generate strong password & create Firebase Auth user ──
    const generatedPassword = generatePassword();

    const newUser = await adminAuth.createUser({
      email,
      password: generatedPassword,
      displayName: fullName,
    });

    // ── Step 6: Create Firestore user document ────────────────
    // IMPORTANT: Never store the plain password in Firestore
    await createDocument("users", newUser.uid, {
      uid: newUser.uid,
      email,
      displayName: fullName,
      role: Role.PRISON_HEAD,
      prisonId: prison.prisonId,
      prisonName: prison.prisonName,
      employeeId: badgeNumber,
      fullNameKn,
      rank: rank || "",
      designation,
      status: "active",
      mustChangePassword: true,
    });

    // ── Step 7: Link prison to this head ──────────────────────
    await updatePrison(prisonId, { headUid: newUser.uid });

    // ── Step 8: Send welcome email with credentials ──────────
    const emailSent = await sendWelcomeEmail(email, {
      fullNameEn: fullName,
      email,
      generatedPassword,
      role: Role.PRISON_HEAD,
      prisonName: prison.prisonName,
    });

    // If email fails, return the temp password so it can be shared manually
    return NextResponse.json({
      success: true,
      uid: newUser.uid,
      email,
      emailSent,
      ...(emailSent ? {} : { tempPassword: generatedPassword }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create Prison Head: ${message}` },
      { status: 500 }
    );
  }
}
