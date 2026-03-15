"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
    if (pct >= 80) return "#3B6D11";
    if (pct >= 60) return "#BA7517";
    return "#A32D2D";
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-[13px] text-white shadow-lg md:bottom-6"
          style={{ backgroundColor: "#1A3C6B", borderLeft: "3px solid #C9A84C" }}
        >
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-kannada text-[16px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
            ರಾಜ್ಯ ಮಟ್ಟದ ಮೇಲ್ವಿಚಾರಣೆ
          </h1>
          <p className="text-[12px]" style={{ color: "#6b7280" }}>
            State-wide Oversight · Super Admin Dashboard
          </p>
        </div>

        {/* ═══ Stats ═══════════════════════════════════ */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="ಒಟ್ಟು ಸಿಬ್ಬಂದಿ" labelEn="Total Staff" value={bmiStats?.total ?? 0} icon="👥" />
          <StatCard label="ಒಟ್ಟು ಕಾರಾಗೃಹ" labelEn="Total Prisons" value={prisons.length} icon="🏛️" />
          <StatCard label="ಸಾಮಾನ್ಯ BMI %" labelEn="Normal BMI %" value={`${bmiStats?.percentNormal ?? 0}%`} icon="💚" valueColor="#3B6D11" />
          <StatCard label="ಅಪಾಯ %" labelEn="At Risk %" value={`${bmiStats?.percentAtRisk ?? 0}%`} icon="🔴" valueColor="#A32D2D" />
          <StatCard label="ಬಾಕಿ ಅನುಮೋದನೆ" labelEn="Pending Plans" value={pendingItems.length} icon="📋" />
        </div>

        {/* ═══ BMI Distribution Chart ══════════════════ */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              <span className="font-kannada">ಕಾರಾಗೃಹವಾರು BMI ವಿತರಣೆ</span>
              <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>BMI Distribution by Prison</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-lg text-[11px]"
              style={{ borderColor: "#e5e7eb", color: "#1A3C6B" }}
              onClick={() => setShowPercent(!showPercent)}
            >
              {showPercent ? "📊 Count" : "📈 %"}
            </Button>
          </div>
          {barData.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-2xl">📊</span>
              <p className="mt-2 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಯಾವುದೇ ಡೇಟಾ ಇಲ್ಲ</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>No prison data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Underweight" stackId="a" fill="#185FA5" />
                <Bar dataKey="Normal" stackId="a" fill="#3B6D11" />
                <Bar dataKey="Overweight" stackId="a" fill="#BA7517" />
                <Bar dataKey="Obese I" stackId="a" fill="#A32D2D" />
                <Bar dataKey="Obese II" stackId="a" fill="#501313" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ═══ Prison Compliance Table ═════════════════ */}
        <div className="mb-6 rounded-xl bg-white shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              <span className="font-kannada">ಕಾರಾಗೃಹ ಅನುಸರಣೆ</span>
              <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>Prison Compliance</span>
            </h2>
            <CreatePrisonModal onPrisonCreated={fetchData} />
          </div>
          <div className="mobile-scroll">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#F5F6FA" }}>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Prison</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>District</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Head</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Staff</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Compliance</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Pending</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compliance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <span className="text-2xl">🏛️</span>
                      <p className="mt-1 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಯಾವುದೇ ಕಾರಾಗೃಹ ರಚಿಸಿಲ್ಲ</p>
                      <p className="text-[11px]" style={{ color: "#6b7280" }}>No prisons created yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  compliance.map((prison) => (
                    <TableRow key={prison.prisonId} className="transition-colors hover:bg-[#fafbff]">
                      <TableCell className="py-2">
                        <p className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>{prison.prisonNameKn}</p>
                        <p className="text-[10px]" style={{ color: "#6b7280" }}>{prison.prisonName}</p>
                      </TableCell>
                      <TableCell className="text-[11px]" style={{ color: "#6b7280" }}>{prison.district}</TableCell>
                      <TableCell className="text-[11px]" style={{ color: "#6b7280" }}>{getHeadName(prison.headUid)}</TableCell>
                      <TableCell className="text-[12px] font-medium" style={{ color: "#1A3C6B" }}>{prison.totalStaff}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ backgroundColor: "#F5F6FA" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${prison.compliancePercent}%`, backgroundColor: complianceColor(prison.compliancePercent) }}
                            />
                          </div>
                          <span className="text-[11px] font-medium" style={{ color: complianceColor(prison.compliancePercent) }}>
                            {prison.compliancePercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {prison.pendingPlans > 0 ? (
                          <Badge className="text-[10px]" style={{ backgroundColor: "#FAEEDA", color: "#633806", border: "none" }}>
                            {prison.pendingPlans}
                          </Badge>
                        ) : (
                          <span className="text-[11px]" style={{ color: "#e5e7eb" }}>0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!prison.headUid && (
                          <CreatePrisonHeadModal preselectedPrisonId={prison.prisonId} onCreated={fetchData} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ═══ Pending Approvals ═════════ */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <h2 className="mb-3 text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
            <span className="font-kannada">ಎಲ್ಲಾ ಬಾಕಿ ಅನುಮೋದನೆಗಳು</span>
            <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>All Pending Approvals</span>
          </h2>
          {pendingItems.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-2xl">✅</span>
              <p className="mt-1 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಯಾವುದೇ ಬಾಕಿ ಯೋಜನೆಗಳಿಲ್ಲ</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>No pending plans across any prison</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div
                  key={item.planId}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{ border: "0.5px solid #e5e7eb" }}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: "#1a1a2e" }}>{item.staffName}</p>
                      <p className="text-[10px]" style={{ color: "#6b7280" }}>{item.prisonName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                      {item.planType === "diet" ? "🍽️ Diet" : "🏋️ Exercise"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 rounded-lg text-[11px]"
                      style={{ backgroundColor: "#EAF3DE", color: "#27500A" }}
                      onClick={() => handleApprove(item)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 rounded-lg text-[11px]"
                      style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
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
        </div>

        {/* ═══ BMI Trend ════════════════════ */}
        <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <h2 className="mb-3 text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
            <span className="font-kannada">ರಾಜ್ಯವ್ಯಾಪಿ BMI ಪ್ರವೃತ್ತಿ</span>
            <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>State-wide BMI Trend (6 months)</span>
          </h2>
          {trendData.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-2xl">📈</span>
              <p className="mt-1 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಯಾವುದೇ ಡೇಟಾ ಇಲ್ಲ</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>No trend data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis domain={[18, 32]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip />
                <ReferenceLine
                  y={23}
                  stroke="#A32D2D"
                  strokeDasharray="6 3"
                  label={{ value: "BMI 23", position: "insideTopRight", fontSize: 10, fill: "#A32D2D" }}
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
        </div>
      </div>

      {/* ═══ Reject Reason Modal ═════════════════════════════════ */}
      <Dialog open={!!rejectModal} onOpenChange={(v) => !v && setRejectModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <span className="font-kannada" style={{ color: "#1A3C6B" }}>ತಿರಸ್ಕರಣೆ ಕಾರಣ</span>
              <span className="ml-2 text-[12px] font-normal" style={{ color: "#6b7280" }}>Rejection Reason</span>
            </DialogTitle>
            <DialogDescription className="text-[11px]" style={{ color: "#6b7280" }}>
              Enter the reason for rejecting this plan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              id="adminRejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="rounded-lg border-[0.5px] text-[13px]"
              style={{ borderColor: "#e5e7eb" }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-lg text-[13px]"
                style={{ borderColor: "#e5e7eb", color: "#1A3C6B" }}
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-lg text-[13px] text-white"
                style={{ backgroundColor: "#A32D2D" }}
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  value: number | string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-xl bg-white p-4 shadow-sm"
      style={{ border: "0.5px solid #e5e7eb" }}
    >
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

export default function SuperAdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.SUPER_ADMIN]}>
      <DashboardLayout>
        <AdminDashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
