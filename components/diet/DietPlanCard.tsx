"use client";

import { useState } from "react";
import type { DietPlanOutput, StoredDietPlan } from "@/types/diet";
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

interface DietPlanCardProps {
  storedPlan: StoredDietPlan | null;
}

function MealSection({
  title,
  titleKn,
  meal,
}: {
  title: string;
  titleKn: string;
  meal: DietPlanOutput["weeklyPlan"][0]["breakfast"];
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">
          <span className="font-kannada">{titleKn}</span>
          <span className="ml-1 text-slate-500">· {title}</span>
        </h4>
        <Badge variant="outline" className="text-xs">
          {meal.totalCalories} kcal
        </Badge>
      </div>
      <ul className="space-y-1">
        {meal.items.map((item, i) => (
          <li key={i} className="flex items-baseline justify-between text-sm">
            <span>
              <span className="font-kannada text-slate-700">{item.nameKn}</span>
              <span className="ml-1 text-slate-400">({item.nameEn})</span>
            </span>
            <span className="ml-2 shrink-0 text-slate-500">
              {item.portion} · {item.calories} kcal
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DietPlanCard({ storedPlan }: DietPlanCardProps) {
  const [selectedDay, setSelectedDay] = useState(0);

  // Empty state
  if (!storedPlan) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <span className="mb-3 text-4xl">🥗</span>
          <h3 className="font-kannada text-lg font-semibold text-slate-800">
            ಯಾವುದೇ ಆಹಾರ ಯೋಜನೆ ಇಲ್ಲ
          </h3>
          <p className="text-sm text-slate-500">No diet plan generated yet</p>
        </CardContent>
      </Card>
    );
  }

  const { plan, status } = storedPlan;
  const day = plan.weeklyPlan[selectedDay];

  // Calculate calorie progress (using daily target = weeklyCalorieTarget / 7)
  const dailyTarget = Math.round(plan.weeklyCalorieTarget / 7);
  const calorieProgress = dailyTarget > 0
    ? Math.min(100, Math.round((day.dailyTotalCalories / dailyTarget) * 100))
    : 0;

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
              ಆಹಾರ ಯೋಜನೆ
            </h3>
            <p className="text-sm text-slate-500">Diet Plan</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">
              💧 {plan.dailyWaterLitres}L / day
            </p>
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

        {/* Meals */}
        {day && (
          <div className="space-y-3">
            <MealSection title="Breakfast" titleKn="ಬೆಳಗಿನ ಉಪಾಹಾರ" meal={day.breakfast} />
            <MealSection title="Lunch" titleKn="ಮಧ್ಯಾಹ್ನದ ಊಟ" meal={day.lunch} />
            <MealSection title="Dinner" titleKn="ರಾತ್ರಿ ಊಟ" meal={day.dinner} />
          </div>
        )}

        {/* Calorie bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              <span className="font-kannada">ಒಟ್ಟು</span> Total: {day?.dailyTotalCalories ?? 0} kcal
            </span>
            <span>Target: {dailyTarget} kcal</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${calorieProgress}%`,
                backgroundColor: calorieProgress > 110 ? "#ef4444" : "#22c55e",
              }}
            />
          </div>
        </div>

        {/* Nutrition notes */}
        {plan.nutritionNotes && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="font-kannada text-xs text-blue-700">{plan.nutritionNotes.kn}</p>
            <p className="text-xs text-blue-600">{plan.nutritionNotes.en}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
