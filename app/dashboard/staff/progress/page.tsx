"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { BMICategory, BMI_CATEGORY_LABELS } from "@/constants/bmi";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/dashboard/Navbar";

import { getHealthLogs, createHealthLog, type HealthLog } from "@/services/health";
import { getStaffProfile } from "@/services/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

// ─── Helpers ──────────────────────────────────────────────────────

function toJsDate(value: unknown): Date {
  if (value && typeof value === "object" && "seconds" in (value as object)) {
    return new Date(((value as { seconds: number }).seconds) * 1000);
  }
  return new Date(value as string | number | Date);
}

const BMI_COLORS: Record<BMICategory, { bg: string; text: string }> = {
  [BMICategory.UNDERWEIGHT]: { bg: "bg-blue-100", text: "text-blue-700" },
  [BMICategory.NORMAL]: { bg: "bg-green-100", text: "text-green-700" },
  [BMICategory.OVERWEIGHT]: { bg: "bg-amber-100", text: "text-amber-700" },
  [BMICategory.OBESE_1]: { bg: "bg-orange-100", text: "text-orange-700" },
  [BMICategory.OBESE_2]: { bg: "bg-red-100", text: "text-red-700" },
};

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Chart data (reversed for chronological order)
  const chartData = [...logs]
    .reverse()
    .map((log) => ({
      date: toJsDate(log.timestamp).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      bmi: log.bmi,
    }));

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      {toastMessage && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-6 py-3 text-sm text-white shadow-xl">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-kannada text-xl font-bold" style={{ color: "#1A3C6B" }}>
              ನನ್ನ ಪ್ರಗತಿ
            </h1>
            <p className="text-sm text-slate-500">My Progress</p>
          </div>

          <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: "#1A3C6B" }} className="text-white">
                <span className="font-kannada">ತೂಕ ದಾಖಲಿಸಿ</span>
                <span className="ml-1 text-xs opacity-75">Log Weight</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle>
                  <span className="font-kannada">ಹೊಸ ತೂಕ</span>
                  <span className="ml-2 text-sm font-normal text-slate-500">New Weight</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="progressWeight">
                    <span className="font-kannada">ತೂಕ (kg)</span>
                  </Label>
                  <Input
                    id="progressWeight"
                    type="number"
                    step="0.1"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    placeholder="72.5"
                  />
                </div>
                <Button
                  onClick={handleLogWeight}
                  disabled={isSubmitting || !logWeight}
                  className="w-full text-white"
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
          <Card className="border-0 bg-slate-100">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-slate-700">{startBmi.toFixed(1)}</p>
              <p className="font-kannada text-xs text-slate-500">ಆರಂಭಿಕ BMI</p>
              <p className="text-[10px] text-slate-400">Starting BMI</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-blue-700">{currentBmi.toFixed(1)}</p>
              <p className="font-kannada text-xs text-blue-600">ಪ್ರಸ್ತುತ BMI</p>
              <p className="text-[10px] text-blue-400">Current BMI</p>
            </CardContent>
          </Card>
          <Card className={`border-0 ${bmiChange <= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${bmiChange <= 0 ? "text-green-700" : "text-red-700"}`}>
                {bmiChange <= 0 ? "↓" : "↑"} {Math.abs(bmiChange).toFixed(1)}
              </p>
              <p className="font-kannada text-xs text-slate-500">ಬದಲಾವಣೆ</p>
              <p className="text-[10px] text-slate-400">Change</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-purple-50">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-purple-700">{bestBmi.toFixed(1)}</p>
              <p className="font-kannada text-xs text-purple-600">ಅತ್ಯುತ್ತಮ BMI</p>
              <p className="text-[10px] text-purple-400">Best BMI</p>
            </CardContent>
          </Card>
        </div>

        {/* BMI Chart */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              <span className="font-kannada">BMI ಇತಿಹಾಸ</span>
              <span className="ml-1 text-slate-400">BMI History</span>
            </h2>
          </CardHeader>
          <CardContent>
            {chartData.length <= 1 ? (
              <div className="py-12 text-center">
                <span className="text-3xl">📊</span>
                <p className="mt-2 font-kannada text-sm text-slate-400">
                  ಹೆಚ್ಚಿನ ಡೇಟಾ ಅಗತ್ಯ
                </p>
                <p className="text-xs text-slate-300">Log more weights to see trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[16, 35]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {/* Normal zone */}
                  <ReferenceArea y1={18.5} y2={22.9} fill="#22c55e" fillOpacity={0.08} />
                  {/* Overweight zone */}
                  <ReferenceArea y1={23} y2={24.9} fill="#f59e0b" fillOpacity={0.08} />
                  {/* Obese zone */}
                  <ReferenceArea y1={25} y2={35} fill="#ef4444" fillOpacity={0.06} />
                  <ReferenceLine y={22.9} stroke="#22c55e" strokeDasharray="4 2" />
                  <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="4 2" />
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
          </CardContent>
        </Card>

        {/* Weight History Table */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              <span className="font-kannada">ತೂಕ ಇತಿಹಾಸ</span>
              <span className="ml-1 text-slate-400">Weight History</span>
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-kannada text-sm text-slate-400">ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ</p>
                <p className="text-xs text-slate-300">No records yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">
                      <span className="font-kannada">ದಿನಾಂಕ</span> Date
                    </TableHead>
                    <TableHead className="text-xs">
                      <span className="font-kannada">ತೂಕ</span> Weight
                    </TableHead>
                    <TableHead className="text-xs">BMI</TableHead>
                    <TableHead className="text-xs">
                      <span className="font-kannada">ವರ್ಗ</span> Category
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const cat = log.bmiCategory;
                    const c = BMI_COLORS[cat] || BMI_COLORS[BMICategory.NORMAL];
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-slate-600">
                          {toJsDate(log.timestamp).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {log.weightKg} kg
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-slate-800">
                          {log.bmi.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${c.bg} ${c.text}`}>
                            {BMI_CATEGORY_LABELS[cat]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.STAFF]}>
      <ProgressContent />
    </ProtectedRoute>
  );
}
