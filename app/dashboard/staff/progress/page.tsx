"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { BMICategory, BMI_CATEGORY_LABELS } from "@/constants/bmi";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

import { getHealthLogs, createHealthLog, type HealthLog } from "@/services/health";
import { getStaffProfile } from "@/services/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

// ─── KSP BMI Badge styles ──────────────────────────────────────────

const BMI_BADGE: Record<BMICategory, { bg: string; text: string }> = {
  [BMICategory.UNDERWEIGHT]: { bg: "#E6F1FB", text: "#0C447C" },
  [BMICategory.NORMAL]: { bg: "#EAF3DE", text: "#27500A" },
  [BMICategory.OVERWEIGHT]: { bg: "#FAEEDA", text: "#633806" },
  [BMICategory.OBESE_1]: { bg: "#FAECE7", text: "#4A1B0C" },
  [BMICategory.OBESE_2]: { bg: "#FCEBEB", text: "#501313" },
};

// ─── Helpers ──────────────────────────────────────────────────────

function toJsDate(value: unknown): Date {
  if (value && typeof value === "object" && "seconds" in (value as object)) {
    return new Date(((value as { seconds: number }).seconds) * 1000);
  }
  return new Date(value as string | number | Date);
}

// ═════════════════════════════════════════════════════════════════

function ProgressContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [heightCm, setHeightCm] = useState(0);
  const [logWeight, setLogWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [healthLogs, profile] = await Promise.all([
        getHealthLogs(user.uid, 100),
        getStaffProfile(user.uid),
      ]);
      setLogs(healthLogs);
      if (profile?.heightCm) setHeightCm(profile.heightCm);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleLogWeight() {
    if (!user || !logWeight || !heightCm) return;
    setIsSubmitting(true);
    try {
      await createHealthLog(user.uid, parseFloat(logWeight), heightCm);
      setToastMessage("✅ ತೂಕ ದಾಖಲಿಸಲಾಗಿದೆ / Weight logged");
      setLogModalOpen(false);
      setLogWeight("");
      await fetchData();
    } catch {
      setToastMessage("❌ ದಾಖಲಿಸಲು ವಿಫಲ / Failed to log");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Stats
  const currentBmi = logs[0]?.bmi ?? 0;
  const startBmi = logs.length > 0 ? logs[logs.length - 1].bmi : 0;
  const bestBmi = logs.length > 0
    ? logs.reduce((best, l) => (Math.abs(l.bmi - 21) < Math.abs(best - 21) ? l.bmi : best), logs[0].bmi)
    : 0;
  const bmiChange = currentBmi - startBmi;

  const chartData = [...logs]
    .reverse()
    .map((log) => ({
      date: toJsDate(log.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      bmi: log.bmi,
    }));

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-[13px] text-white shadow-lg"
          style={{ backgroundColor: "#1A3C6B", borderLeft: "3px solid #C9A84C" }}
        >
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-kannada text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              ನನ್ನ ಪ್ರಗತಿ
            </h1>
            <p className="text-[12px]" style={{ color: "#6b7280" }}>My Progress</p>
          </div>

          <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-lg text-[13px] text-white"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                <span className="font-kannada">ತೂಕ ದಾಖಲಿಸಿ</span>
                <span className="ml-1 text-[11px] opacity-75">Log Weight</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle>
                  <span className="font-kannada" style={{ color: "#1A3C6B" }}>ಹೊಸ ತೂಕ</span>
                  <span className="ml-2 text-[12px] font-normal" style={{ color: "#6b7280" }}>New Weight</span>
                </DialogTitle>
                <DialogDescription className="text-[11px]" style={{ color: "#6b7280" }}>
                  Enter your current weight in kilograms
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="progressWeight" className="text-[11px]" style={{ color: "#6b7280" }}>
                    <span className="font-kannada">ತೂಕ (kg)</span>
                  </Label>
                  <Input
                    id="progressWeight"
                    type="number"
                    step="0.1"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    placeholder="72.5"
                    className="h-9 rounded-lg border-[0.5px] text-[13px]"
                    style={{ borderColor: "#e5e7eb" }}
                  />
                </div>
                <Button
                  onClick={handleLogWeight}
                  disabled={isSubmitting || !logWeight}
                  className="w-full rounded-lg text-[13px] text-white"
                  style={{ backgroundColor: "#1A3C6B" }}
                >
                  {isSubmitting ? "..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="ಆರಂಭಿಕ BMI" labelEn="Starting BMI" value={startBmi.toFixed(1)} icon="📍" />
          <StatCard label="ಪ್ರಸ್ತುತ BMI" labelEn="Current BMI" value={currentBmi.toFixed(1)} icon="📊" valueColor="#185FA5" />
          <StatCard
            label="ಬದಲಾವಣೆ"
            labelEn="Change"
            value={`${bmiChange <= 0 ? "↓" : "↑"} ${Math.abs(bmiChange).toFixed(1)}`}
            icon={bmiChange <= 0 ? "📉" : "📈"}
            valueColor={bmiChange <= 0 ? "#3B6D11" : "#A32D2D"}
          />
          <StatCard label="ಅತ್ಯುತ್ತಮ BMI" labelEn="Best BMI" value={bestBmi.toFixed(1)} icon="🏆" valueColor="#C9A84C" />
        </div>

        {/* BMI Chart */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <h2 className="mb-3 text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
            <span className="font-kannada">BMI ಇತಿಹಾಸ</span>
            <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>BMI History</span>
          </h2>
          {chartData.length <= 1 ? (
            <div className="py-12 text-center">
              <span className="text-3xl">📊</span>
              <p className="mt-2 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಹೆಚ್ಚಿನ ಡೇಟಾ ಅಗತ್ಯ</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>Log more weights to see trends</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis domain={[16, 35]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip />
                {/* Normal zone */}
                <ReferenceArea y1={18.5} y2={22.9} fill="#3B6D11" fillOpacity={0.06} />
                {/* Overweight zone */}
                <ReferenceArea y1={23} y2={24.9} fill="#BA7517" fillOpacity={0.06} />
                {/* Obese zone */}
                <ReferenceArea y1={25} y2={35} fill="#A32D2D" fillOpacity={0.04} />
                <ReferenceLine y={22.9} stroke="#3B6D11" strokeDasharray="4 2" />
                <ReferenceLine y={25} stroke="#A32D2D" strokeDasharray="4 2" />
                <Line
                  type="monotone"
                  dataKey="bmi"
                  stroke="#1A3C6B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#1A3C6B" }}
                  name="BMI"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weight History Table */}
        <div className="rounded-xl bg-white shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <div className="p-4 pb-3">
            <h2 className="text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              <span className="font-kannada">ತೂಕ ಇತಿಹಾಸ</span>
              <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>Weight History</span>
            </h2>
          </div>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>No records yet</p>
            </div>
          ) : (
            <div className="mobile-scroll">
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: "#F5F6FA" }}>
                    <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>
                      <span className="font-kannada">ದಿನಾಂಕ</span> Date
                    </TableHead>
                    <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>
                      <span className="font-kannada">ತೂಕ</span> Weight
                    </TableHead>
                    <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>BMI</TableHead>
                    <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>
                      <span className="font-kannada">ವರ್ಗ</span> Category
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const cat = log.bmiCategory;
                    const badge = BMI_BADGE[cat] || BMI_BADGE[BMICategory.NORMAL];
                    return (
                      <TableRow key={log.id} className="transition-colors hover:bg-[#fafbff]">
                        <TableCell className="text-[11px]" style={{ color: "#6b7280" }}>
                          {toJsDate(log.timestamp).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-[12px] font-medium" style={{ color: "#1a1a2e" }}>
                          {log.weightKg} kg
                        </TableCell>
                        <TableCell className="text-[12px] font-medium" style={{ color: "#1A3C6B" }}>
                          {log.bmi.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Badge className="text-[10px]" style={{ backgroundColor: badge.bg, color: badge.text, border: "none" }}>
                            {BMI_CATEGORY_LABELS[cat]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label,
  labelEn,
  value,
  icon,
  valueColor,
}: {
  label: string;
  labelEn: string;
  value: string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-[22px]" style={{ color: valueColor || "#1A3C6B", fontWeight: 500 }}>{value}</p>
          <p className="font-kannada text-[10px]" style={{ color: "#6b7280" }}>{label}</p>
          <p className="text-[11px]" style={{ color: "#6b7280" }}>{labelEn}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ─────────────────────────────────────────────────────

export default function ProgressPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <DashboardLayout>
        <ProgressContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
