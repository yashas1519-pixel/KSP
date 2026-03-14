/**
 * Cron route: GET /api/cron/checkin-reminder
 * Scans all prisons and creates check-in overdue alerts
 * for staff who haven't logged weight in 30+ days.
 *
 * Secured with CRON_SECRET env var.
 */

import "server-only";

import { NextResponse } from "next/server";
import { getAllPrisons } from "@/services/prisons";
import { checkCheckInAlerts } from "@/lib/monitoring";

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const prisons = await getAllPrisons(100);
    let totalAlerts = 0;

    for (const prison of prisons) {
      const count = await checkCheckInAlerts(prison.prisonId);
      totalAlerts += count;
    }

    return NextResponse.json({
      success: true,
      alertsCreated: totalAlerts,
      prisonsChecked: prisons.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Cron failed: ${message}` },
      { status: 500 }
    );
  }
}
