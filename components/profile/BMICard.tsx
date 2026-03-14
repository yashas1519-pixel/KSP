"use client";

import { useState } from "react";
import { BMICategory, BMI_CATEGORY_LABELS } from "@/constants/bmi";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";
import { createHealthLog } from "@/services/health";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Color + Labels per BMI Category ────────────────────────────────

interface CategoryInfo {
  color: string;
  bgColor: string;
  borderColor: string;
  labelKn: string;
  adviceKn: string;
  adviceEn: string;
}

const CATEGORY_INFO: Record<BMICategory, CategoryInfo> = {
  [BMICategory.UNDERWEIGHT]: {
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    labelKn: "ಕಡಿಮೆ ತೂಕ",
    adviceKn: "ಹೆಚ್ಚು ಪೋಷಕಾಂಶಗಳನ್ನು ಸೇವಿಸಿ",
    adviceEn: "Include more nutritious foods in your diet",
  },
  [BMICategory.NORMAL]: {
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    labelKn: "ಸಾಮಾನ್ಯ",
    adviceKn: "ನಿಮ್ಮ ಆರೋಗ್ಯ ಉತ್ತಮವಾಗಿದೆ",
    adviceEn: "Your health is good",
  },
  [BMICategory.OVERWEIGHT]: {
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    labelKn: "ಅಧಿಕ ತೂಕ",
    adviceKn: "ಆಹಾರ ಕ್ರಮ ಅನುಸರಿಸಿ",
    adviceEn: "Follow your diet plan",
  },
  [BMICategory.OBESE_1]: {
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    labelKn: "ಸ್ಥೂಲಕಾಯ I",
    adviceKn: "ತಕ್ಷಣ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ",
    adviceEn: "Consult a doctor soon",
  },
  [BMICategory.OBESE_2]: {
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    labelKn: "ಸ್ಥೂಲಕಾಯ II",
    adviceKn: "ತಕ್ಷಣ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ",
    adviceEn: "Consult a doctor soon",
  },
};

// ─── BMICard Component ──────────────────────────────────────────────

interface BMICardProps {
  userId: string;
  bmi: number;
  category: BMICategory;
  heightCm: number;
  lastUpdated?: Date | string;
  onWeightLogged?: () => void;
}

export function BMICard({
  userId,
  bmi,
  category,
  heightCm,
  lastUpdated,
  onWeightLogged,
}: BMICardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const info = CATEGORY_INFO[category];
  const categoryLabel = BMI_CATEGORY_LABELS[category];

  async function handleLogWeight() {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 250) return;

    setIsSaving(true);
    try {
      await createHealthLog(userId, weight, heightCm);
      setNewWeight("");
      setIsOpen(false);
      onWeightLogged?.();
    } finally {
      setIsSaving(false);
    }
  }

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <Card className={`border-2 ${info.borderColor}`}>
      <CardHeader className={`${info.bgColor} pb-3`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">
              <span className="font-kannada">ಬಿಎಂಐ</span> / BMI
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${info.color}`}>
                {bmi.toFixed(1)}
              </span>
              <span className="text-lg text-slate-400">kg/m²</span>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`${info.bgColor} ${info.color} border-current px-3 py-1 text-sm font-semibold`}
          >
            <span className="font-kannada">{info.labelKn}</span>
            <span className="mx-1">·</span>
            <span>{categoryLabel}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Advice line */}
        <div className={`rounded-lg ${info.bgColor} p-3`}>
          <p className={`font-kannada text-sm font-medium ${info.color}`}>
            {info.adviceKn}
          </p>
          <p className={`text-sm ${info.color} opacity-80`}>
            {info.adviceEn}
          </p>
        </div>

        {/* Footer: timestamp + log button */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Last updated: {formattedDate}
          </p>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <span className="font-kannada">ಹೊಸ ತೂಕ</span>
                <span className="ml-1 text-xs text-slate-500">Log Weight</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  <span className="font-kannada">ಹೊಸ ತೂಕ ದಾಖಲಿಸಿ</span>
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    Log New Weight
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label htmlFor="newWeight" className="block text-sm font-medium">
                    <span className="font-kannada">ತೂಕ (ಕೆ.ಜಿ.)</span>
                    <span className="ml-2 text-slate-500">Weight (kg)</span>
                  </label>
                  <Input
                    id="newWeight"
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="70"
                    min={30}
                    max={250}
                    step={0.1}
                  />
                  {newWeight && (() => {
                    const w = parseFloat(newWeight);
                    if (!isNaN(w) && w > 0) {
                      const newBmi = calculateBMI(w, heightCm);
                      const newCat = classifyBMI(newBmi);
                      const newInfo = CATEGORY_INFO[newCat];
                      return (
                        <p className={`text-sm font-medium ${newInfo.color}`}>
                          BMI: {newBmi.toFixed(1)} — {BMI_CATEGORY_LABELS[newCat]}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <Button
                  onClick={handleLogWeight}
                  disabled={isSaving || !newWeight}
                  className="w-full text-white"
                  style={{ backgroundColor: "#1A3C6B" }}
                >
                  {isSaving ? "ಉಳಿಸಲಾಗುತ್ತಿದೆ..." : "ಉಳಿಸಿ / Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
