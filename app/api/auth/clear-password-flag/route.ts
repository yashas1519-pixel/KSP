import "server-only";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { updateDocument } from "@/lib/firebase/firestore";

/**
 * POST /api/auth/clear-password-flag
 * Clears the mustChangePassword flag after the user changes their password.
 * Only the authenticated user can clear their own flag.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    await updateDocument("users", uid, {
      mustChangePassword: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to clear password flag: ${message}` },
      { status: 500 }
    );
  }
}
