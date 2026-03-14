/**
 * API route: POST /api/admin/create-prison
 * Creates a new prison document in Firestore.
 *
 * Security: SUPER_ADMIN only.
 */

import "server-only";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getDocument } from "@/lib/firebase/firestore";
import { Role } from "@/constants/roles";
import type { User } from "@/types/user";
import { createPrison, getPrisonById } from "@/services/prisons";

export async function POST(request: Request) {
  try {
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
        { error: "Forbidden: only Super Admins can create prisons" },
        { status: 403 }
      );
    }

    // ── Step 3: Parse and validate ────────────────────────────
    const body = await request.json();
    const { prisonName, prisonNameKn, district, districtKn } = body;

    if (!prisonName || !prisonNameKn || !district) {
      return NextResponse.json(
        { error: "Missing required fields: prisonName, prisonNameKn, district" },
        { status: 400 }
      );
    }

    // Auto-generate prisonId from name
    const prisonId = prisonName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if already exists
    const existing = await getPrisonById(prisonId);
    if (existing) {
      return NextResponse.json(
        { error: `Prison with ID '${prisonId}' already exists` },
        { status: 409 }
      );
    }

    // ── Step 4: Create prison document ────────────────────────
    await createPrison({
      prisonId,
      prisonName,
      prisonNameKn,
      district,
      districtKn: districtKn || "",
      totalStaff: 0,
    });

    return NextResponse.json({
      success: true,
      prisonId,
      prisonName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create prison: ${message}` },
      { status: 500 }
    );
  }
}
