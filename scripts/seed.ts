/**
 * Seed script — creates test accounts in Firebase Auth + Firestore.
 *
 * Usage:  npm run seed
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in .env.local (base64-encoded).
 * Does NOT auto-run — only when explicitly invoked.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ─── Init Admin SDK ──────────────────────────────────────────────────

const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!base64Key) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(base64Key, "base64").toString("utf-8")
);

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

const auth = getAuth(app);
const db = getFirestore(app);

// ─── Types ───────────────────────────────────────────────────────────

interface SeedUser {
  email: string;
  password: string;
  role: string;
  fullNameEn: string;
  fullNameKn?: string;
  badgeNumber?: string;
  rank?: string;
  dutyType?: string;
  heightCm?: number;
  currentWeightKg?: number;
  dietPreference?: string;
  prisonId?: string;
  status: string;
}

// ─── Seed Data ───────────────────────────────────────────────────────

const USERS: SeedUser[] = [
  {
    email: "admin@ksp.test",
    password: "Admin@1234",
    role: "SUPER_ADMIN",
    fullNameEn: "Super Admin",
    status: "active",
  },
  {
    email: "head@ksp.test",
    password: "Head@1234",
    role: "PRISON_HEAD",
    fullNameEn: "Prison Head Ramesh",
    prisonId: "central-prison-bangalore",
    status: "active",
  },
  {
    email: "staff1@ksp.test",
    password: "Staff@1234",
    role: "STAFF",
    fullNameEn: "Constable Suresh Kumar",
    fullNameKn: "ಕಾನ್ಸ್ಟೇಬಲ್ ಸುರೇಶ್ ಕುಮಾರ್",
    badgeNumber: "KSP001",
    rank: "Constable",
    dutyType: "field",
    heightCm: 170,
    currentWeightKg: 78,
    dietPreference: "veg",
    prisonId: "central-prison-bangalore",
    status: "active",
  },
  {
    email: "staff2@ksp.test",
    password: "Staff@1234",
    role: "STAFF",
    fullNameEn: "Head Constable Ravi",
    fullNameKn: "ಹೆಡ್ ಕಾನ್ಸ್ಟೇಬಲ್ ರವಿ",
    badgeNumber: "KSP002",
    rank: "Head Constable",
    dutyType: "administrative",
    heightCm: 168,
    currentWeightKg: 92,
    dietPreference: "non_veg",
    prisonId: "central-prison-bangalore",
    status: "active",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 23) return "NORMAL";
  if (bmi < 25) return "OVERWEIGHT";
  if (bmi < 30) return "OBESE_1";
  return "OBESE_2";
}

/**
 * Generate 3 months of sample health logs with a realistic weight trend.
 */
function generateHealthLogs(
  userId: string,
  heightCm: number,
  startWeightKg: number
): Array<Record<string, unknown>> {
  const logs: Array<Record<string, unknown>> = [];
  const now = new Date();

  for (let i = 12; i >= 0; i--) {
    // Simulate gradual weight change (slight variation)
    const weekOffset = i;
    const jitter = (Math.random() - 0.5) * 1.5; // ±0.75 kg noise
    const trend = -0.15 * (12 - i); // slow downward trend
    const weight = parseFloat((startWeightKg + trend + jitter).toFixed(1));
    const bmi = calculateBMI(weight, heightCm);
    const category = classifyBMI(bmi);

    const date = new Date(now);
    date.setDate(date.getDate() - weekOffset * 7); // weekly entries over ~3 months

    const id = `seed-log-${userId.slice(0, 8)}-${String(i).padStart(2, "0")}`;

    logs.push({
      id,
      userId,
      weightKg: weight,
      heightCm,
      bmi,
      bmiCategory: category,
      timestamp: date,
      createdAt: date,
      updatedAt: date,
    });
  }

  return logs;
}

// ─── Main ────────────────────────────────────────────────────────────

async function createOrGetUser(userData: SeedUser): Promise<string> {
  try {
    // Check if user already exists
    const existing = await auth.getUserByEmail(userData.email);
    console.log(`  ℹ️  ${userData.email} already exists (uid: ${existing.uid})`);
    return existing.uid;
  } catch {
    // User doesn't exist — create
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.fullNameEn,
      emailVerified: true,
    });
    console.log(`  ✅ Created ${userData.email} (uid: ${userRecord.uid})`);
    return userRecord.uid;
  }
}

async function seed() {
  console.log("\n🌱 KSP Fitness — Seed Script\n");
  console.log("─".repeat(50));

  const uidMap: Record<string, string> = {};
  const now = new Date();

  // 1. Create users
  console.log("\n📦 Creating users...\n");
  for (const userData of USERS) {
    try {
      const uid = await createOrGetUser(userData);
      uidMap[userData.email] = uid;

      // Build Firestore user doc
      const userDoc: Record<string, unknown> = {
        uid,
        email: userData.email,
        role: userData.role,
        fullNameEn: userData.fullNameEn,
        status: userData.status,
        createdAt: now,
        updatedAt: now,
      };

      if (userData.fullNameKn) userDoc.fullNameKn = userData.fullNameKn;
      if (userData.prisonId) userDoc.prisonId = userData.prisonId;
      if (userData.badgeNumber) userDoc.badgeNumber = userData.badgeNumber;
      if (userData.rank) userDoc.rank = userData.rank;
      if (userData.dutyType) userDoc.dutyType = userData.dutyType;
      if (userData.heightCm) userDoc.heightCm = userData.heightCm;
      if (userData.currentWeightKg) userDoc.currentWeightKg = userData.currentWeightKg;
      if (userData.dietPreference) userDoc.dietPreference = userData.dietPreference;

      await db.collection("users").doc(uid).set(userDoc, { merge: true });
      console.log(`  ✅ Firestore doc saved for ${userData.email}`);
    } catch (error) {
      console.error(`  ❌ Failed: ${userData.email}`, error);
    }
  }

  // 2. Create prison document
  console.log("\n🏢 Creating prison...\n");
  const headUid = uidMap["head@ksp.test"] || "";
  try {
    await db.collection("prisons").doc("central-prison-bangalore").set(
      {
        prisonId: "central-prison-bangalore",
        prisonNameEn: "Central Prison Bangalore",
        prisonNameKn: "ಕೇಂದ್ರ ಕಾರಾಗೃಹ ಬೆಂಗಳೂರು",
        district: "Bengaluru Urban",
        headUid,
        totalStaff: 2,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
    console.log("  ✅ Prison: central-prison-bangalore");
  } catch (error) {
    console.error("  ❌ Prison creation failed:", error);
  }

  // 3. Create health logs for staff
  console.log("\n📊 Creating health logs...\n");

  const staffEntries = [
    { email: "staff1@ksp.test", heightCm: 170, startWeight: 78 },
    { email: "staff2@ksp.test", heightCm: 168, startWeight: 92 },
  ];

  for (const entry of staffEntries) {
    const uid = uidMap[entry.email];
    if (!uid) {
      console.log(`  ⚠️ Skipping logs for ${entry.email} — uid not found`);
      continue;
    }

    const logs = generateHealthLogs(uid, entry.heightCm, entry.startWeight);
    const batch = db.batch();

    for (const log of logs) {
      const ref = db.collection("health_logs").doc(log.id as string);
      batch.set(ref, log, { merge: true });
    }

    await batch.commit();
    console.log(`  ✅ ${logs.length} health logs created for ${entry.email}`);
  }

  // Done
  console.log("\n" + "─".repeat(50));
  console.log("🎉 Seed complete!\n");
  console.log("Test accounts:");
  console.log("  admin@ksp.test   / Admin@1234   → SUPER_ADMIN");
  console.log("  head@ksp.test    / Head@1234    → PRISON_HEAD");
  console.log("  staff1@ksp.test  / Staff@1234   → STAFF (veg, overweight)");
  console.log("  staff2@ksp.test  / Staff@1234   → STAFF (non-veg, obese)\n");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
