"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/dashboard/Navbar";
import { getExercisePlansByUser } from "@/services/exercise";
import type { StoredExercisePlan } from "@/types/exercise";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="font-kannada text-xl font-bold" style={{ color: "#1A3C6B" }}>
            ವ್ಯಾಯಾಮ ಯೋಜನೆ
          </h1>
          <p className="text-sm text-slate-500">Exercise Plan</p>
        </div>

        {!activePlan ? (
          <Card className="border-0">
            <CardContent className="py-12 text-center">
              <span className="text-4xl">🏋️</span>
              <p className="mt-3 font-kannada text-sm text-slate-500">
                ಯಾವುದೇ ವ್ಯಾಯಾಮ ಯೋಜನೆ ಲಭ್ಯವಿಲ್ಲ
              </p>
              <p className="text-xs text-slate-400">No exercise plan available yet</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Badge className={
                activePlan.status === "approved" ? "bg-green-100 text-green-700" :
                activePlan.status === "pending_approval" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-700"
              }>
                {activePlan.status === "approved" ? "✅ Approved" :
                 activePlan.status === "pending_approval" ? "⏳ Pending" :
                 activePlan.status}
              </Badge>
            </div>

            <Tabs defaultValue="0">
              <TabsList className="mb-4 flex-wrap">
                {DAYS.map((day, i) => (
                  <TabsTrigger key={day} value={String(i)} className="text-xs">
                    <span className="font-kannada">{DAYS_KN[i]}</span>
                    <span className="ml-1 hidden text-[10px] opacity-70 sm:inline">{day}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {DAYS.map((day, i) => {
                const dayPlan = activePlan.plan?.weeklyPlan?.[i];
                return (
                  <TabsContent key={day} value={String(i)}>
                    <Card>
                      <CardHeader className="pb-2">
                        <h2 className="font-kannada text-base font-semibold text-slate-700">
                          {DAYS_KN[i]} · {day}
                        </h2>
                      </CardHeader>
                      <CardContent>
                        {!dayPlan ? (
                          <p className="text-sm text-slate-400">No plan for this day</p>
                        ) : (
                          <div className="space-y-4">
                            {dayPlan.restDay ? (
                              <div className="py-6 text-center">
                                <span className="text-2xl">🧘</span>
                                <p className="mt-2 font-kannada text-sm text-slate-500">ವಿಶ್ರಾಂತಿ ದಿನ</p>
                                <p className="text-xs text-slate-400">Rest Day</p>
                              </div>
                            ) : (
                              dayPlan.exercises?.map((ex, ei: number) => (
                                <div key={ei} className="rounded-lg border border-slate-100 p-3">
                                  <h3 className="text-sm font-semibold text-slate-700">
                                    {ex.nameKn || ex.nameEn}
                                  </h3>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                    {ex.sets > 0 && <span>{ex.sets} sets</span>}
                                    {ex.reps && <span>× {ex.reps}</span>}
                                    {ex.durationMinutes > 0 && <span>⏱️ {ex.durationMinutes} min</span>}
                                  </div>
                                  {ex.notes && (
                                    <p className="mt-1 text-[10px] italic text-slate-400">{ex.notes}</p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

export default function ExercisePage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <ExerciseContent />
    </ProtectedRoute>
  );
}
