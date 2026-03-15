"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getExercisePlansByUser } from "@/services/exercise";
import type { StoredExercisePlan } from "@/types/exercise";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_KN = ["ಸೋಮವಾರ", "ಮಂಗಳವಾರ", "ಬುಧವಾರ", "ಗುರುವಾರ", "ಶುಕ್ರವಾರ", "ಶನಿವಾರ", "ಭಾನುವಾರ"];

function ExerciseContent() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StoredExercisePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getExercisePlansByUser(user.uid, 5);
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const activePlan = plans.find((p) => p.status === "approved") || plans[0];

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-kannada text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
          ವ್ಯಾಯಾಮ ಯೋಜನೆ
        </h1>
        <p className="text-[12px]" style={{ color: "#6b7280" }}>Exercise Plan</p>
      </div>

      {!activePlan ? (
        <div className="rounded-xl bg-white py-12 text-center shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <span className="text-4xl">🏋️</span>
          <p className="mt-3 font-kannada text-[12px]" style={{ color: "#6b7280" }}>
            ಯಾವುದೇ ವ್ಯಾಯಾಮ ಯೋಜನೆ ಲಭ್ಯವಿಲ್ಲ
          </p>
          <p className="text-[11px]" style={{ color: "#6b7280" }}>No exercise plan available yet</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Badge
              className="text-[10px]"
              style={{
                backgroundColor: activePlan.status === "approved" ? "#EAF3DE" : activePlan.status === "pending_approval" ? "#FAEEDA" : "#F5F6FA",
                color: activePlan.status === "approved" ? "#27500A" : activePlan.status === "pending_approval" ? "#633806" : "#6b7280",
                border: "none",
              }}
            >
              {activePlan.status === "approved" ? "✅ Approved" :
               activePlan.status === "pending_approval" ? "⏳ Pending" :
               activePlan.status}
            </Badge>
          </div>

          <Tabs defaultValue="0">
            <TabsList className="mb-4 flex-wrap rounded-lg p-1" style={{ backgroundColor: "#F5F6FA" }}>
              {DAYS.map((day, i) => (
                <TabsTrigger
                  key={day}
                  value={String(i)}
                  className="rounded-md text-[11px] data-[state=active]:text-white"
                  style={{ color: "#6b7280" }}
                >
                  <span className="font-kannada">{DAYS_KN[i]}</span>
                  <span className="ml-1 hidden text-[9px] opacity-70 sm:inline">{day}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {DAYS.map((day, i) => {
              const dayPlan = activePlan.plan?.weeklyPlan?.[i];
              return (
                <TabsContent key={day} value={String(i)}>
                  <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
                    <h2 className="mb-3 font-kannada text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
                      {DAYS_KN[i]} · {day}
                    </h2>
                    {!dayPlan ? (
                      <p className="text-[12px]" style={{ color: "#6b7280" }}>No plan for this day</p>
                    ) : (
                      <div className="space-y-3">
                        {dayPlan.restDay ? (
                          <div className="py-6 text-center">
                            <span className="text-2xl">🧘</span>
                            <p className="mt-2 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ವಿಶ್ರಾಂತಿ ದಿನ</p>
                            <p className="text-[11px]" style={{ color: "#6b7280" }}>Rest Day</p>
                          </div>
                        ) : (
                          dayPlan.exercises?.map((ex, ei: number) => (
                            <div key={ei} className="rounded-lg p-3" style={{ border: "0.5px solid #e5e7eb" }}>
                              <h3 className="text-[12px] font-medium" style={{ color: "#1a1a2e" }}>
                                {ex.nameKn || ex.nameEn}
                              </h3>
                              <div className="mt-1 flex flex-wrap gap-2 text-[10px]" style={{ color: "#6b7280" }}>
                                {ex.sets > 0 && <span>{ex.sets} sets</span>}
                                {ex.reps && <span>× {ex.reps}</span>}
                                {ex.durationMinutes > 0 && <span>⏱️ {ex.durationMinutes} min</span>}
                              </div>
                              {ex.notes && (
                                <p className="mt-1 text-[10px] italic" style={{ color: "#6b7280" }}>{ex.notes}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}
    </div>
  );
}

export default function ExercisePage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <DashboardLayout>
        <ExerciseContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
