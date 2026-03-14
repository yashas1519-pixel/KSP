/**
 * API route: POST /api/exercise/generate
 * Generates a personalised exercise plan using Claude AI.
 */

import { NextResponse } from "next/server";
import { generateExercisePlan } from "@/lib/claude/exercise";
import { getDocument, createDocument } from "@/lib/firebase/firestore";
import { apiRateLimiter, getClientIP } from "@/lib/rate-limit";
import type { StaffProfile } from "@/types/user";
import type { ExercisePlanInput } from "@/types/exercise";

export async function POST(request: Request) {
  try {
    // Rate limit check
    const ip = getClientIP(request);
    const rl = apiRateLimiter.check(`exercise:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetInMs / 1000)) } }
      );
    }

    // 1. Get auth token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const uid = authHeader.replace("Bearer ", "").trim();
    if (!uid) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // 2. Fetch staff profile from Firestore
    const profile = await getDocument<StaffProfile>("users", uid);
    if (!profile) {
      return NextResponse.json(
        { error: "Staff profile not found" },
        { status: 404 }
      );
    }

    // 3. Calculate age from DOB
    const dob = new Date(profile.dateOfBirth);
    const now = new Date();
    const ageYears = Math.floor(
      (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    // 4. Build exercise plan input
    const input: ExercisePlanInput = {
      uid: profile.uid,
      bmiCategory: (await import("@/lib/utils/bmi")).classifyBMI(
        (await import("@/lib/utils/bmi")).calculateBMI(
          profile.currentWeightKg,
          profile.heightCm
        )
      ),
      ageYears,
      gender: profile.gender,
      dutyType: profile.dutyType,
      existingConditions: profile.existingConditions || [],
    };

    // 5. Generate exercise plan via Claude
    const plan = await generateExercisePlan(input);

    // 6. Save to Firestore as draft
    const planId = `${uid}_draft`;
    await createDocument("exercise_plans", planId, {
      id: planId,
      userId: uid,
      plan,
      status: "pending_approval",
      generatedAt: new Date(),
    });

    return NextResponse.json({ success: true, planId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate exercise plan: ${message}` },
      { status: 500 }
    );
  }
}
