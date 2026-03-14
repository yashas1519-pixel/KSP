"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StaffProfileForm } from "@/components/profile/StaffProfileForm";
import { BMICard } from "@/components/profile/BMICard";
import { getStaffProfile, updateUserProfile } from "@/services/user";
import { getLatestHealthLog, type HealthLog } from "@/services/health";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";
import type { StaffProfile } from "@/types/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // If profile is not complete → show the form
  if (!profile?.profileComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="mb-6 text-center">
          <h1 className="font-kannada text-2xl font-bold" style={{ color: "#1A3C6B" }}>
            ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ
          </h1>
          <p className="text-slate-500">Complete Your Profile</p>
        </div>
        <StaffProfileForm onComplete={fetchData} />
      </div>
    );
  }

  // Profile is complete → show full profile view
  const bmi = latestLog?.bmi ?? calculateBMI(profile.currentWeightKg, profile.heightCm);
  const bmiCategory = latestLog?.bmiCategory ?? classifyBMI(bmi);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Top: Profile header */}
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center gap-5 pt-6">
            {/* Photo placeholder */}
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
              style={{ backgroundColor: "#1A3C6B" }}
            >
              {profile.fullNameEn?.charAt(0) || "?"}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-kannada text-xl font-bold text-slate-800">
                {profile.fullNameKn}
              </h1>
              <p className="text-lg text-slate-600">{profile.fullNameEn}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {profile.badgeNumber}
                </Badge>
                <Badge
                  className="text-xs text-white"
                  style={{ backgroundColor: "#1A3C6B" }}
                >
                  {profile.rank}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {profile.dutyType}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Middle: BMI Card */}
        <BMICard
          userId={user!.uid}
          bmi={bmi}
          category={bmiCategory}
          heightCm={profile.heightCm}
          lastUpdated={latestLog?.timestamp}
          onWeightLogged={fetchData}
        />

        {/* Bottom: Editable fields */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <h2 className="font-kannada text-lg font-semibold text-slate-800">
                ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ
              </h2>
              <p className="text-sm text-slate-500">Update Details</p>
            </div>
            {!editMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                ✏️ Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSaveEdits}
                  className="text-white"
                  style={{ backgroundColor: "#1A3C6B" }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">
                  <span className="font-kannada">ತೂಕ (ಕೆ.ಜಿ.)</span> / Weight
                </label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                  />
                ) : (
                  <p className="text-lg font-semibold">
                    {profile.currentWeightKg} kg
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">
                  <span className="font-kannada">ಸೊಂಟ (ಸೆ.ಮೀ.)</span> / Waist
                </label>
                {editMode ? (
                  <Input
                    type="number"
                    value={editWaist}
                    onChange={(e) => setEditWaist(e.target.value)}
                  />
                ) : (
                  <p className="text-lg font-semibold">
                    {profile.waistCm ? `${profile.waistCm} cm` : "—"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">
                <span className="font-kannada">ಸಾಧನೆಗಳು</span> / Achievements
              </label>
              {editMode ? (
                <textarea
                  value={editAchievements}
                  onChange={(e) => setEditAchievements(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <div className="space-y-1">
                  {profile.achievements?.length ? (
                    profile.achievements.map((a, i) => (
                      <p key={i} className="text-sm text-slate-700">
                        • {a}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No achievements listed</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StaffProfilePage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <ProfileContent />
    </ProtectedRoute>
  );
}
