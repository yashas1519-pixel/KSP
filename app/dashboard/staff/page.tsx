"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile?.profileComplete) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <span className="mb-4 text-5xl">📋</span>
        <h1 className="font-kannada text-[18px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
          ಮೊದಲು ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ
        </h1>
        <p className="mb-4 text-[12px]" style={{ color: "#6b7280" }}>Please complete your profile first</p>
        <a
          href="/dashboard/staff/profile"
          className="inline-flex h-10 items-center rounded-lg px-6 text-[13px] font-medium text-white"
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
    <>
      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-[13px] text-white shadow-lg md:bottom-6"
          style={{ backgroundColor: "#1A3C6B", borderLeft: "3px solid #C9A84C" }}
        >
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-kannada text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              ನಮಸ್ಕಾರ, {profile.fullNameKn}
            </h1>
            <p className="text-[12px]" style={{ color: "#6b7280" }}>{profile.fullNameEn}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#e5e7eb" }}>{profile.badgeNumber}</Badge>
            <Badge className="text-[10px] text-white" style={{ backgroundColor: "#1A3C6B" }}>{profile.rank}</Badge>
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

        {/* Request Plans */}
        <div className="flex justify-center">
          <Button
            onClick={handleRequestPlans}
            disabled={generating}
            className="h-10 rounded-lg px-8 text-[13px] text-white"
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
                <span className="ml-1 text-[11px] opacity-75">Request New Plan</span>
              </>
            )}
          </Button>
        </div>

        {/* Diet Plan */}
        <DietPlanCard storedPlan={dietPlan} />

        {/* Exercise Plan */}
        <ExercisePlanCard storedPlan={exercisePlan} />
      </div>
    </>
  );
}

export default function StaffDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
