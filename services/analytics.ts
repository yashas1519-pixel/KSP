/**
 * Analytics service — aggregated stats for Super Admin dashboard.
 * All queries are bounded with limits to avoid unbounded reads.
 */

import { getAllStaff, getStaffByPrison } from "@/services/user";
import { getAllPrisons, type Prison } from "@/services/prisons";
import { getLatestHealthLog, getHealthLogs } from "@/services/health";
import { getPendingDietPlans } from "@/services/diet";
import { getPendingExercisePlans } from "@/services/exercise";
import { BMICategory } from "@/constants/bmi";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";

// ─── Types ──────────────────────────────────────────────────────────

export interface StateWideBMIStats {
  total: number;
  underweight: number;
  normal: number;
  overweight: number;
  obese1: number;
  obese2: number;
  percentNormal: number;
  percentAtRisk: number;
}

export interface PrisonCompliance {
  prisonId: string;
  prisonName: string;
  prisonNameKn: string;
  district: string;
  headUid?: string;
  totalStaff: number;
  checkedInLast30Days: number;
  compliancePercent: number;
  pendingPlans: number;
}

export interface BMITrendPoint {
  month: string;
  averageBmi: number;
  count: number;
}

export interface PrisonBMIBreakdown {
  prisonId: string;
  prisonName: string;
  underweight: number;
  normal: number;
  overweight: number;
  obese1: number;
  obese2: number;
  total: number;
}

// ─── State-wide BMI stats ───────────────────────────────────────────

export async function getStateWideBMIStats(): Promise<StateWideBMIStats> {
  const allStaff = await getAllStaff(500);

  const stats: StateWideBMIStats = {
    total: allStaff.length,
    underweight: 0,
    normal: 0,
    overweight: 0,
    obese1: 0,
    obese2: 0,
    percentNormal: 0,
    percentAtRisk: 0,
  };

  for (const s of allStaff) {
    const log = await getLatestHealthLog(s.uid);
    const bmi = log?.bmi ?? (s.heightCm && s.currentWeightKg ? calculateBMI(s.currentWeightKg, s.heightCm) : null);
    if (bmi === null) continue;

    const cat = log?.bmiCategory ?? classifyBMI(bmi);
    switch (cat) {
      case BMICategory.UNDERWEIGHT: stats.underweight++; break;
      case BMICategory.NORMAL: stats.normal++; break;
      case BMICategory.OVERWEIGHT: stats.overweight++; break;
      case BMICategory.OBESE_1: stats.obese1++; break;
      case BMICategory.OBESE_2: stats.obese2++; break;
    }
  }

  const staffWithBmi = stats.underweight + stats.normal + stats.overweight + stats.obese1 + stats.obese2;
  if (staffWithBmi > 0) {
    stats.percentNormal = Math.round((stats.normal / staffWithBmi) * 100);
    stats.percentAtRisk = Math.round(
      ((stats.overweight + stats.obese1 + stats.obese2) / staffWithBmi) * 100
    );
  }

  return stats;
}

// ─── Prison compliance rates ────────────────────────────────────────

export async function getPrisonComplianceRates(): Promise<PrisonCompliance[]> {
  const prisons = await getAllPrisons(100);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const results: PrisonCompliance[] = [];

  for (const prison of prisons) {
    const staff = await getStaffByPrison(prison.prisonId, 200);
    const staffUids = staff.map((s) => s.uid);

    let checkedInCount = 0;
    for (const s of staff) {
      const log = await getLatestHealthLog(s.uid);
      if (log) {
        const logDate = typeof log.timestamp === "object" && "seconds" in (log.timestamp as object)
          ? new Date(((log.timestamp as unknown as { seconds: number }).seconds) * 1000)
          : new Date(log.timestamp);
        if (logDate >= thirtyDaysAgo) {
          checkedInCount++;
        }
      }
    }

    let pendingPlans = 0;
    if (staffUids.length > 0) {
      const [dietPending, exercisePending] = await Promise.all([
        getPendingDietPlans(staffUids),
        getPendingExercisePlans(staffUids),
      ]);
      pendingPlans = dietPending.length + exercisePending.length;
    }

    results.push({
      prisonId: prison.prisonId,
      prisonName: prison.prisonName,
      prisonNameKn: prison.prisonNameKn,
      district: prison.district,
      headUid: prison.headUid,
      totalStaff: staff.length,
      checkedInLast30Days: checkedInCount,
      compliancePercent: staff.length > 0
        ? Math.round((checkedInCount / staff.length) * 100)
        : 0,
      pendingPlans,
    });
  }

  return results;
}

// ─── BMI breakdown per prison (for bar chart) ───────────────────────

export async function getPrisonBMIBreakdowns(): Promise<PrisonBMIBreakdown[]> {
  const prisons = await getAllPrisons(100);
  const results: PrisonBMIBreakdown[] = [];

  for (const prison of prisons) {
    const staff = await getStaffByPrison(prison.prisonId, 200);
    const breakdown: PrisonBMIBreakdown = {
      prisonId: prison.prisonId,
      prisonName: prison.prisonName,
      underweight: 0,
      normal: 0,
      overweight: 0,
      obese1: 0,
      obese2: 0,
      total: staff.length,
    };

    for (const s of staff) {
      const log = await getLatestHealthLog(s.uid);
      const bmi = log?.bmi ?? (s.heightCm && s.currentWeightKg ? calculateBMI(s.currentWeightKg, s.heightCm) : null);
      if (bmi === null) continue;
      const cat = log?.bmiCategory ?? classifyBMI(bmi);
      switch (cat) {
        case BMICategory.UNDERWEIGHT: breakdown.underweight++; break;
        case BMICategory.NORMAL: breakdown.normal++; break;
        case BMICategory.OVERWEIGHT: breakdown.overweight++; break;
        case BMICategory.OBESE_1: breakdown.obese1++; break;
        case BMICategory.OBESE_2: breakdown.obese2++; break;
      }
    }

    results.push(breakdown);
  }

  return results;
}

// ─── Monthly BMI trend (state-wide) ─────────────────────────────────

export async function getBMITrendData(
  months: number = 6
): Promise<BMITrendPoint[]> {
  const allStaff = await getAllStaff(200);
  const points: BMITrendPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const label = monthDate.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

    let totalBmi = 0;
    let count = 0;

    for (const s of allStaff) {
      const logs = await getHealthLogs(s.uid, 1);
      const log = logs[0];
      if (log && log.bmi) {
        // Use the latest available BMI as a proxy for that month
        totalBmi += log.bmi;
        count++;
      }
    }

    points.push({
      month: label,
      averageBmi: count > 0 ? Math.round((totalBmi / count) * 10) / 10 : 0,
      count,
    });
  }

  return points;
}
