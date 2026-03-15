"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StaffProfileForm } from "@/components/profile/StaffProfileForm";
import { BMICard } from "@/components/profile/BMICard";
import { getStaffProfile, updateUserProfile } from "@/services/user";
import { getLatestHealthLog, type HealthLog } from "@/services/health";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";
import type { StaffProfile } from "@/types/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [latestLog, setLatestLog] = useState<HealthLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editWeight, setEditWeight] = useState("");
  const [editWaist, setEditWaist] = useState("");
  const [editAchievements, setEditAchievements] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);
    try {
      const [profileData, logData] = await Promise.all([
        getStaffProfile(user.uid),
        getLatestHealthLog(user.uid),
      ]);
      setProfile(profileData);
      setLatestLog(logData);

      if (profileData) {
        setEditWeight(String(profileData.currentWeightKg || ""));
        setEditWaist(String(profileData.waistCm || ""));
        setEditAchievements(
          profileData.achievements?.join("\n") || ""
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      setFetchError(`ಪ್ರೊಫೈಲ್ ಲೋಡ್ ವಿಫಲ / Failed to load profile: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveEdits() {
    if (!user || !profile) return;
    setIsSaving(true);
    try {
      const updates: Partial<StaffProfile> = {};
      const weight = parseFloat(editWeight);
      if (!isNaN(weight) && weight > 0) {
        updates.currentWeightKg = weight;
      }
      const waist = parseFloat(editWaist);
      if (!isNaN(waist) && waist > 0) {
        updates.waistCm = waist;
      }
      if (editAchievements !== profile.achievements?.join("\n")) {
        updates.achievements = editAchievements
          .split("\n")
          .filter(Boolean);
      }
      await updateUserProfile(user.uid, updates);
      setEditMode(false);
      await fetchData();
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: "#FCEBEB" }}
          >
            ⚠️
          </div>
          <p className="text-[13px]" style={{ color: "#A32D2D" }}>{fetchError}</p>
          <Button
            onClick={fetchData}
            className="mt-4 rounded-lg text-[13px] text-white"
            style={{ backgroundColor: "#1A3C6B" }}
          >
            ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ / Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!profile?.profileComplete) {
    return (
      <div className="px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="font-kannada text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
            ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ
          </h1>
          <p className="text-[12px]" style={{ color: "#6b7280" }}>Complete Your Profile</p>
        </div>
        <StaffProfileForm onComplete={fetchData} />
      </div>
    );
  }

  const bmi = latestLog?.bmi ?? calculateBMI(profile.currentWeightKg, profile.heightCm);
  const bmiCategory = latestLog?.bmiCategory ?? classifyBMI(bmi);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Profile Header */}
      <div className="rounded-xl bg-white p-5 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
        <div className="flex items-center gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl text-white"
            style={{ backgroundColor: "#1A3C6B", fontWeight: 500 }}
          >
            {profile.fullNameEn?.charAt(0) || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-kannada text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              {profile.fullNameKn}
            </h1>
            <p className="text-[13px]" style={{ color: "#6b7280" }}>{profile.fullNameEn}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#e5e7eb" }}>
                {profile.badgeNumber}
              </Badge>
              <Badge className="text-[10px] text-white" style={{ backgroundColor: "#1A3C6B" }}>
                {profile.rank}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize" style={{ borderColor: "#e5e7eb" }}>
                {profile.dutyType}
              </Badge>
            </div>
          </div>
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

      {/* Editable Details */}
      <div className="rounded-xl bg-white shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="font-kannada text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ
            </h2>
            <p className="text-[11px]" style={{ color: "#6b7280" }}>Update Details</p>
          </div>
          {!editMode ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-[11px]"
              style={{ borderColor: "#e5e7eb", color: "#1A3C6B" }}
              onClick={() => setEditMode(true)}
            >
              ✏️ Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-[11px]"
                style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
                onClick={() => setEditMode(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSaving}
                onClick={handleSaveEdits}
                className="rounded-lg text-[11px] text-white"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px]" style={{ color: "#6b7280" }}>
                <span className="font-kannada">ತೂಕ (ಕೆ.ಜಿ.)</span>
                <span className="ml-1">Weight</span>
              </label>
              {editMode ? (
                <Input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  className="h-9 rounded-lg border-[0.5px] text-[13px]"
                  style={{ borderColor: "#e5e7eb" }}
                />
              ) : (
                <p className="text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
                  {profile.currentWeightKg} kg
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px]" style={{ color: "#6b7280" }}>
                <span className="font-kannada">ಸೊಂಟ (ಸೆ.ಮೀ.)</span>
                <span className="ml-1">Waist</span>
              </label>
              {editMode ? (
                <Input
                  type="number"
                  value={editWaist}
                  onChange={(e) => setEditWaist(e.target.value)}
                  className="h-9 rounded-lg border-[0.5px] text-[13px]"
                  style={{ borderColor: "#e5e7eb" }}
                />
              ) : (
                <p className="text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
                  {profile.waistCm ? `${profile.waistCm} cm` : "—"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: "#6b7280" }}>
              <span className="font-kannada">ಸಾಧನೆಗಳು</span>
              <span className="ml-1">Achievements</span>
            </label>
            {editMode ? (
              <textarea
                value={editAchievements}
                onChange={(e) => setEditAchievements(e.target.value)}
                rows={3}
                className="flex w-full rounded-lg border-[0.5px] bg-white px-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: "#e5e7eb" }}
              />
            ) : (
              <div className="space-y-1">
                {profile.achievements?.length ? (
                  profile.achievements.map((a, i) => (
                    <p key={i} className="text-[13px]" style={{ color: "#1a1a2e" }}>
                      • {a}
                    </p>
                  ))
                ) : (
                  <p className="text-[12px]" style={{ color: "#6b7280" }}>No achievements listed</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffProfilePage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <DashboardLayout>
        <ProfileContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
