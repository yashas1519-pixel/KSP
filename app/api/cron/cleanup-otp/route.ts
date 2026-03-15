import "server-only";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/cron/cleanup-otp
 * Cleanup expired OTP docs and used/expired reset tokens.
 * Secured with CRON_SECRET.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Timestamp.now();
    const oneHourAgo = Timestamp.fromMillis(now.toMillis() - 60 * 60 * 1000);
    let totalDeleted = 0;

    // Delete expired OTP docs older than 1 hour
    const otpDocs = await adminDb
      .collection("otp_requests")
      .where("expiresAt", "<", oneHourAgo)
      .limit(500)
      .get();

    const otpBatch = adminDb.batch();
    otpDocs.docs.forEach((doc) => {
      otpBatch.delete(doc.ref);
      totalDeleted++;
    });
    if (otpDocs.size > 0) {
      await otpBatch.commit();
    }

    // Delete used or expired reset tokens
    const usedTokens = await adminDb
      .collection("password_reset_tokens")
      .where("used", "==", true)
      .limit(500)
      .get();

    const expiredTokens = await adminDb
      .collection("password_reset_tokens")
      .where("expiresAt", "<", now)
      .limit(500)
      .get();

    const tokenBatch = adminDb.batch();
    const deletedIds = new Set<string>();

    usedTokens.docs.forEach((doc) => {
      if (!deletedIds.has(doc.id)) {
        tokenBatch.delete(doc.ref);
        deletedIds.add(doc.id);
        totalDeleted++;
      }
    });

    expiredTokens.docs.forEach((doc) => {
      if (!deletedIds.has(doc.id)) {
        tokenBatch.delete(doc.ref);
        deletedIds.add(doc.id);
        totalDeleted++;
      }
    });

    if (deletedIds.size > 0) {
      await tokenBatch.commit();
    }

    return NextResponse.json({ success: true, deleted: totalDeleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Cleanup failed: ${message}` },
      { status: 500 }
    );
  }
}
