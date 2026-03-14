"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { BMICard } from "@/components/profile/BMICard";
import { DietPlanCard } from "@/components/diet/DietPlanCard";
import { ExercisePlanCard } from "@/components/exercise/ExercisePlanCard";
import { getStaffProfile } from "@/services/user";
import { getLatestHealthLog, type HealthLog } from "@/services/health";
import { getDocument } from "@/lib/firebase/firestore";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";
import type { StaffProfile } from "@/types/user";
import type { StoredDietPlan } from "@/types/diet";
import type { StoredExercisePlan } from "@/types/exercise";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [latestLog, setLatestLog] = useState<HealthLog | null>(null);
  const [dietPlan, setDietPlan] = useState<StoredDietPlan | null>(null);
  const [exercisePlan, setExercisePlan] = useState<StoredExercisePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileData, logData, dietData, exerciseData] = await Promise.all([
        getStaffProfile(user.uid),
        getLatestHealthLog(user.uid),
        getDocument<StoredDietPlan>("diet_plans", `${user.uid}_draft`),
        getDocument<StoredExercisePlan>("exercise_plans", `${user.uid}_draft`),
      ]);
      setProfile(profileData);
      setLatestLog(logData);
      setDietPlan(dietData);
      setExercisePlan(exerciseData);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show toast temporarily
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  async function handleRequestPlans() {
    if (!user) return;
    setGenerating(true);
    setToastMessage("ಯೋಜನೆ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ / Plan is being generated...");

    try {
      const [dietRes, exerciseRes] = await Promise.all([
        fetch("/api/diet/generate", {
          method: "POST",
          headers: { Authorization: `Bearer ${user.uid}` },
        }),
        fetch("/api/exercise/generate", {
          method: "POST",
          headers: { Authorization: `Bearer ${user.uid}` },
        }),
      ]);

      if (dietRes.ok && exerciseRes.ok) {
        setToastMessage("ಯೋಜನೆ ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ / Plans generated successfully!");
        await fetchData();
      } else {
        const dietErr = !dietRes.ok ? await dietRes.json() : null;
        const exErr = !exerciseRes.ok ? await exerciseRes.json() : null;
        const msg = dietErr?.error || exErr?.error || "Failed to generate plans";
        setToastMessage(`❌ ${msg}`);
      }
    } catch {
      setToastMessage("❌ ಯೋಜನೆ ರಚಿಸಲು ವಿಫಲವಾಗಿದೆ / Failed to generate plans");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile?.profileComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <span className="mb-4 text-5xl">📋</span>
        <h1 className="font-kannada text-2xl font-bold text-slate-800">
          ಮೊದಲು ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ
        </h1>
        <p className="mb-4 text-slate-500">Please complete your profile first</p>
        <a
          href="/dashboard/staff/profile"
          className="inline-flex h-10 items-center rounded-md px-6 text-sm font-medium text-white"
          style={{ backgroundColor: "#1A3C6B" }}
        >
          ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ / Complete Profile
        </a>
      </div>
    );
  }

  const bmi = latestLog?.bmi ?? calculateBMI(profile.currentWeightKg, profile.heightCm);
  const bmiCategory = latestLog?.bmiCategory ?? classifyBMI(bmi);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 animate-pulse rounded-lg bg-slate-900 px-6 py-3 text-sm text-white shadow-xl">
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-kannada text-xl font-bold" style={{ color: "#1A3C6B" }}>
              {profile.fullNameKn}
            </h1>
            <p className="text-sm text-slate-500">{profile.fullNameEn}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">{profile.badgeNumber}</Badge>
            <Badge className="text-xs text-white" style={{ backgroundColor: "#1A3C6B" }}>
              {profile.rank}
            </Badge>
          </div>
        </div>

        {/* BMI Card */}
        <BMICard
          userId={user!.uid}
          bmi={bmi}
          category={bmiCategory}
          heightCm={profile.heightCm}
          lastUpdated={latestLog?.timestamp}
          onWeightLogged={fetchData}
        />

        {/* Request Plans button */}
        <div className="flex justify-center">
          <Button
            onClick={handleRequestPlans}
            disabled={generating}
            className="h-11 px-8 text-white"
            style={{ backgroundColor: generating ? "#94a3b8" : "#1A3C6B" }}
          >
            {generating ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="font-kannada">ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...</span>
                <span className="ml-1">Generating...</span>
              </>
            ) : (
              <>
                🤖
                <span className="ml-2 font-kannada">ಹೊಸ ಯೋಜನೆ ವಿನಂತಿಸಿ</span>
                <span className="ml-1 text-xs opacity-75">Request New Plan</span>
              </>
            )}
          </Button>
        </div>

        {/* Diet Plan */}
        <DietPlanCard storedPlan={dietPlan} />

        {/* Exercise Plan */}
        <ExercisePlanCard storedPlan={exercisePlan} />
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
