"use client";

import { useState } from "react";
import type { StoredExercisePlan } from "@/types/exercise";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAY_TABS = [
  { en: "Mon", kn: "ಸೋ" },
  { en: "Tue", kn: "ಮಂ" },
  { en: "Wed", kn: "ಬು" },
  { en: "Thu", kn: "ಗು" },
  { en: "Fri", kn: "ಶು" },
  { en: "Sat", kn: "ಶ" },
  { en: "Sun", kn: "ಭಾ" },
];

interface ExercisePlanCardProps {
  storedPlan: StoredExercisePlan | null;
}

export function ExercisePlanCard({ storedPlan }: ExercisePlanCardProps) {
  const [selectedDay, setSelectedDay] = useState(0);

  // Empty state
  if (!storedPlan) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <span className="mb-3 text-4xl">🏋️</span>
          <h3 className="font-kannada text-lg font-semibold text-slate-800">
            ಯಾವುದೇ ವ್ಯಾಯಾಮ ಯೋಜನೆ ಇಲ್ಲ
          </h3>
          <p className="text-sm text-slate-500">No exercise plan generated yet</p>
        </CardContent>
      </Card>
    );
  }

  const { plan, status } = storedPlan;
  const day = plan.weeklyPlan[selectedDay];

  return (
    <Card className="border-0 shadow-lg">
      {/* Pending banner */}
      {status === "pending_approval" && (
        <div className="rounded-t-lg bg-amber-50 px-4 py-2 text-center">
          <p className="font-kannada text-sm font-medium text-amber-700">
            ಯೋಜನೆ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ
          </p>
          <p className="text-xs text-amber-600">Plan is being reviewed</p>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-kannada text-lg font-semibold text-slate-800">
              ವ್ಯಾಯಾಮ ಯೋಜನೆ
            </h3>
            <p className="text-sm text-slate-500">Exercise Plan</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Day tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {DAY_TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`flex shrink-0 flex-col items-center rounded-lg px-3 py-1.5 text-xs transition-colors ${
                selectedDay === i
                  ? "text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              style={selectedDay === i ? { backgroundColor: "#1A3C6B" } : undefined}
            >
              <span className="font-kannada font-medium">{tab.kn}</span>
              <span>{tab.en}</span>
            </button>
          ))}
        </div>

        {/* Day content */}
        {day && (
          day.restDay ? (
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-green-200 bg-green-50 py-10">
              <span className="mb-2 text-4xl">🧘</span>
              <h4 className="font-kannada text-lg font-semibold text-green-700">
                ವಿಶ್ರಾಂತಿ ದಿನ
              </h4>
              <p className="text-sm text-green-600">Rest Day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Focus area */}
              <div className="flex items-center gap-2">
                <Badge
                  className="text-xs text-white"
                  style={{ backgroundColor: "#1A3C6B" }}
                >
                  <span className="font-kannada">{day.focusKn}</span>
                  <span className="ml-1">· {day.focus}</span>
                </Badge>
                <span className="text-xs text-slate-400">
                  ⏱ {day.totalDurationMinutes} min
                </span>
              </div>

              {/* Exercises list */}
              <div className="space-y-2">
                {day.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        <span className="font-kannada">{ex.nameKn}</span>
                        <span className="ml-1 text-slate-400">({ex.nameEn})</span>
                      </p>
                      {ex.notes && (
                        <p className="mt-0.5 text-xs text-slate-500">{ex.notes}</p>
                      )}
                    </div>
                    <div className="ml-3 shrink-0 text-right text-xs text-slate-500">
                      <p>
                        {ex.sets > 0 && `${ex.sets}×${ex.reps}`}
                        {ex.sets > 0 && ex.durationMinutes > 0 && " · "}
                        {ex.durationMinutes > 0 && `${ex.durationMinutes}min`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Weekly notes */}
        {plan.weeklyNotes && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="font-kannada text-xs text-blue-700">{plan.weeklyNotes.kn}</p>
            <p className="text-xs text-blue-600">{plan.weeklyNotes.en}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
