"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/dashboard/Navbar";
import { CreatePrisonModal } from "@/components/dashboard/CreatePrisonModal";
import { CreatePrisonHeadModal } from "@/components/dashboard/CreatePrisonHeadModal";

import {
  getStateWideBMIStats,
  getPrisonComplianceRates,
  getPrisonBMIBreakdowns,
  getBMITrendData,
  type StateWideBMIStats,
  type PrisonCompliance,
  type PrisonBMIBreakdown,
  type BMITrendPoint,
} from "@/services/analytics";
import { getAllPrisons, type Prison } from "@/services/prisons";
import { getAllPrisonHeads } from "@/services/user";
import { getPendingDietPlans, approveDietPlan, rejectDietPlan } from "@/services/diet";
import { getPendingExercisePlans, approveExercisePlan, rejectExercisePlan } from "@/services/exercise";
import { getAllStaff } from "@/services/user";
import { createAlert } from "@/services/notifications";

import type { PrisonHead } from "@/types/user";

import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────

interface PendingItem {
  planId: string;
  planType: "diet" | "exercise";
  staffUid: string;
  staffName: string;
  prisonName: string;
  generatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════
// Dashboard Content
// ═══════════════════════════════════════════════════════════════════

function AdminDashboardContent() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bmiStats, setBmiStats] = useState<StateWideBMIStats | null>(null);
  const [compliance, setCompliance] = useState<PrisonCompliance[]>([]);
  const [bmiBreakdowns, setBmiBreakdowns] = useState<PrisonBMIBreakdown[]>([]);
  const [trendData, setTrendData] = useState<BMITrendPoint[]>([]);
  const [prisons, setPrisons] = useState<Prison[]>([]);
  const [prisonHeads, setPrisonHeads] = useState<PrisonHead[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [showPercent, setShowPercent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<PendingItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // ─── Data fetching ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [stats, comp, breakdowns, trends, prisonList, headsList] = await Promise.all([
        getStateWideBMIStats(),
        getPrisonComplianceRates(),
        getPrisonBMIBreakdowns(),
        getBMITrendData(6),
        getAllPrisons(100),
        getAllPrisonHeads(100),
      ]);

      setBmiStats(stats);
      setCompliance(comp);
      setBmiBreakdowns(breakdowns);
      setTrendData(trends);
      setPrisons(prisonList);
      setPrisonHeads(headsList);

      // Fetch ALL pending plans across all prisons
      const allStaff = await getAllStaff(500);
      const staffUids = allStaff.map((s) => s.uid);
      if (staffUids.length > 0) {
        const [dietPending, exercisePending] = await Promise.all([
          getPendingDietPlans(staffUids),
          getPendingExercisePlans(staffUids),
        ]);

        const items: PendingItem[] = [];
        for (const p of dietPending) {
          const s = allStaff.find((x) => x.uid === p.userId);
          items.push({
            planId: p.id,
            planType: "diet",
            staffUid: p.userId,
            staffName: s?.fullNameEn || s?.displayName || "Unknown",
            prisonName: s?.prisonName || "—",
            generatedAt: p.generatedAt,
          });
        }
        for (const p of exercisePending) {
          const s = allStaff.find((x) => x.uid === p.userId);
          items.push({
            planId: p.id,
            planType: "exercise",
            staffUid: p.userId,
            staffName: s?.fullNameEn || s?.displayName || "Unknown",
            prisonName: s?.prisonName || "—",
            generatedAt: p.generatedAt,
          });
        }
        setPendingItems(items);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Actions ────────────────────────────────────────────────────
  async function handleApprove(item: PendingItem) {
    if (!user) return;
    try {
      if (item.planType === "diet") {
        await approveDietPlan(item.planId, user.uid);
      } else {
        await approveExercisePlan(item.planId, user.uid);
      }
      await createAlert(
        item.staffUid,
        "plan_approved",
        `Your ${item.planType} plan has been approved by admin.`,
        `ನಿಮ್ಮ ${item.planType === "diet" ? "ಆಹಾರ" : "ವ್ಯಾಯಾಮ"} ಯೋಜನೆಯನ್ನು ಆಡಳಿತ ಅನುಮೋದಿಸಿದೆ.`
      );
      setToastMessage("✅ Approved");
      setPendingItems((prev) => prev.filter((p) => p.planId !== item.planId));
    } catch {
      setToastMessage("❌ Approval failed");
    }
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      if (rejectModal.planType === "diet") {
        await rejectDietPlan(rejectModal.planId, rejectReason);
      } else {
        await rejectExercisePlan(rejectModal.planId, rejectReason);
      }
      await createAlert(
        rejectModal.staffUid,
        "plan_rejected",
        `Your ${rejectModal.planType} plan was rejected: ${rejectReason}`,
        `ನಿಮ್ಮ ಯೋಜನೆಯನ್ನು ತಿರಸ್ಕರಿಸಲಾಗಿದೆ.`
      );
      setToastMessage("❌ Rejected");
      setPendingItems((prev) => prev.filter((p) => p.planId !== rejectModal.planId));
      setRejectModal(null);
      setRejectReason("");
    } catch {
      setToastMessage("❌ Rejection failed");
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────
  function getHeadName(headUid?: string): string {
    if (!headUid) return "—";
    const h = prisonHeads.find((p) => p.uid === headUid);
    return h?.displayName || "—";
  }

  function complianceColor(pct: number): string {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 60) return "bg-amber-500";
    return "bg-red-500";
  }

  // ─── Bar chart data ─────────────────────────────────────────────
  const barData = bmiBreakdowns.map((b) => {
    if (showPercent && b.total > 0) {
      return {
        name: b.prisonName.length > 15 ? b.prisonName.slice(0, 15) + "…" : b.prisonName,
        Underweight: Math.round((b.underweight / b.total) * 100),
        Normal: Math.round((b.normal / b.total) * 100),
        Overweight: Math.round((b.overweight / b.total) * 100),
        "Obese I": Math.round((b.obese1 / b.total) * 100),
        "Obese II": Math.round((b.obese2 / b.total) * 100),
      };
    }
    return {
      name: b.prisonName.length > 15 ? b.prisonName.slice(0, 15) + "…" : b.prisonName,
      Underweight: b.underweight,
      Normal: b.normal,
      Overweight: b.overweight,
      "Obese I": b.obese1,
      "Obese II": b.obese2,
    };
  });

  // ─── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-6 py-3 text-sm text-white shadow-xl">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-kannada text-xl font-bold" style={{ color: "#1A3C6B" }}>
            ರಾಜ್ಯ ಮಟ್ಟದ ಮೇಲ್ವಿಚಾರಣೆ
          </h1>
          <p className="text-sm text-slate-500">
            State-wide Oversight · Super Admin Dashboard
          </p>
        </div>

        {/* ═══ Section A — Stats ═══════════════════════════════════ */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="ಒಟ್ಟು ಸಿಬ್ಬಂದಿ" labelEn="Total Staff" value={bmiStats?.total ?? 0} icon="👥" color="bg-slate-100 text-slate-700" />
          <StatCard label="ಒಟ್ಟು ಕಾರಾಗೃಹ" labelEn="Total Prisons" value={prisons.length} icon="🏛️" color="bg-blue-50 text-blue-700" />
          <StatCard label="ಸಾಮಾನ್ಯ BMI %" labelEn="Normal BMI %" value={`${bmiStats?.percentNormal ?? 0}%`} icon="💚" color="bg-green-50 text-green-700" />
          <StatCard label="ಅಪಾಯ %" labelEn="At Risk %" value={`${bmiStats?.percentAtRisk ?? 0}%`} icon="🔴" color="bg-red-50 text-red-700" />
          <StatCard label="ಬಾಕಿ ಅನುಮೋದನೆ" labelEn="Pending Plans" value={pendingItems.length} icon="📋" color="bg-purple-50 text-purple-700" />
        </div>

        {/* ═══ Section B — BMI Distribution Chart ══════════════════ */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                <span className="font-kannada">ಕಾರಾಗೃಹವಾರು BMI ವಿತರಣೆ</span>
                <span className="ml-1 text-slate-400">BMI Distribution by Prison</span>
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setShowPercent(!showPercent)}
              >
                {showPercent ? "📊 Count" : "📈 %"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No prison data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Underweight" stackId="a" fill="#60a5fa" />
                  <Bar dataKey="Normal" stackId="a" fill="#34d399" />
                  <Bar dataKey="Overweight" stackId="a" fill="#fbbf24" />
                  <Bar dataKey="Obese I" stackId="a" fill="#fb923c" />
                  <Bar dataKey="Obese II" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ═══ Section C — Prison Compliance Table ═════════════════ */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                <span className="font-kannada">ಕಾರಾಗೃಹ ಅನುಸರಣೆ</span>
                <span className="ml-1 text-slate-400">Prison Compliance</span>
              </h2>
              <CreatePrisonModal onPrisonCreated={fetchData} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Prison</TableHead>
                    <TableHead className="text-xs">District</TableHead>
                    <TableHead className="text-xs">Head</TableHead>
                    <TableHead className="text-xs">Staff</TableHead>
                    <TableHead className="text-xs">Compliance</TableHead>
                    <TableHead className="text-xs">Pending</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-400">
                        No prisons created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    compliance.map((prison) => (
                      <TableRow key={prison.prisonId}>
                        <TableCell>
                          <div>
                            <p className="font-kannada text-sm font-medium text-slate-800">
                              {prison.prisonNameKn}
                            </p>
                            <p className="text-xs text-slate-400">{prison.prisonName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{prison.district}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {getHeadName(prison.headUid)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {prison.totalStaff}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${complianceColor(prison.compliancePercent)}`}
                                style={{ width: `${prison.compliancePercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">
                              {prison.compliancePercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {prison.pendingPlans > 0 ? (
                            <Badge className="bg-purple-100 text-purple-700 text-[10px]">
                              {prison.pendingPlans}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-300">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!prison.headUid && (
                            <CreatePrisonHeadModal
                              preselectedPrisonId={prison.prisonId}
                              onCreated={fetchData}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Section D — Pending Approvals (all prisons) ═════════ */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              <span className="font-kannada">ಎಲ್ಲಾ ಬಾಕಿ ಅನುಮೋದನೆಗಳು</span>
              <span className="ml-1 text-slate-400">All Pending Approvals</span>
            </h2>
          </CardHeader>
          <CardContent>
            {pendingItems.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-3xl">✅</span>
                <p className="mt-2 text-sm text-slate-400">No pending plans across any prison</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div
                    key={item.planId}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.staffName}</p>
                        <p className="text-xs text-slate-400">{item.prisonName}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {item.planType === "diet" ? "🍽️ Diet" : "🏋️ Exercise"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
                        onClick={() => handleApprove(item)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-200 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setRejectModal(item);
                          setRejectReason("");
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ Section E — State-wide BMI Trend ════════════════════ */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              <span className="font-kannada">ರಾಜ್ಯವ್ಯಾಪಿ BMI ಪ್ರವೃತ್ತಿ</span>
              <span className="ml-1 text-slate-400">State-wide BMI Trend (6 months)</span>
            </h2>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No trend data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[18, 32]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <ReferenceLine
                    y={23}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    label={{ value: "BMI 23 (UL)", position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageBmi"
                    stroke="#1A3C6B"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#1A3C6B" }}
                    name="Avg BMI"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Reject Reason Modal ═════════════════════════════════ */}
      <Dialog open={!!rejectModal} onOpenChange={(v) => !v && setRejectModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <span className="font-kannada">ತಿರಸ್ಕರಣೆ ಕಾರಣ</span>
              <span className="ml-2 text-sm font-normal text-slate-500">Rejection Reason</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              id="adminRejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label,
  labelEn,
  value,
  icon,
  color,
}: {
  label: string;
  labelEn: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <Card className={`${color} border-0`}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="font-kannada text-[11px]">{label}</p>
          <p className="text-[10px] opacity-70">{labelEn}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page Export ─────────────────────────────────────────────────────

export default function SuperAdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
