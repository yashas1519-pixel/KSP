"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/dashboard/Navbar";
import { getDietPlansByUser } from "@/services/diet";
import type { StoredDietPlan } from "@/types/diet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_KN = ["ಸೋಮವಾರ", "ಮಂಗಳವಾರ", "ಬುಧವಾರ", "ಗುರುವಾರ", "ಶುಕ್ರವಾರ", "ಶನಿವಾರ", "ಭಾನುವಾರ"];

function DietContent() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StoredDietPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDietPlansByUser(user.uid, 5);
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
            ಆಹಾರ ಯೋಜನೆ
          </h1>
          <p className="text-sm text-slate-500">Diet Plan</p>
        </div>

        {!activePlan ? (
          <Card className="border-0">
            <CardContent className="py-12 text-center">
              <span className="text-4xl">🍽️</span>
              <p className="mt-3 font-kannada text-sm text-slate-500">
                ಯಾವುದೇ ಆಹಾರ ಯೋಜನೆ ಲಭ್ಯವಿಲ್ಲ
              </p>
              <p className="text-xs text-slate-400">No diet plan available yet</p>
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

            <Tabs defaultValue="0" className="print:block">
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
                            {(["breakfast", "lunch", "dinner"] as const).map((mealKey) => {
                              const meal = dayPlan[mealKey];
                              if (!meal) return null;
                              const mealLabels = {
                                breakfast: { en: "Breakfast", kn: "ಬೆಳಗಿನ ಉಪಾಹಾರ" },
                                lunch: { en: "Lunch", kn: "ಮಧ್ಯಾಹ್ನದ ಊಟ" },
                                dinner: { en: "Dinner", kn: "ರಾತ್ರಿ ಊಟ" },
                              };
                              return (
                                <div key={mealKey} className="rounded-lg border border-slate-100 p-3">
                                  <h3 className="text-sm font-semibold text-slate-700">
                                    <span className="font-kannada">{mealLabels[mealKey].kn}</span>
                                    <span className="ml-1 text-xs text-slate-400">{mealLabels[mealKey].en}</span>
                                  </h3>
                                  <ul className="mt-1 space-y-0.5">
                                    {meal.items?.map((item, ii: number) => (
                                      <li key={ii} className="text-xs text-slate-600">
                                        • {item.nameKn || item.nameEn} — {item.portion}
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    ~{meal.totalCalories} kcal
                                  </p>
                                </div>
                              );
                            })}
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

export default function DietPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <DietContent />
    </ProtectedRoute>
  );
}
