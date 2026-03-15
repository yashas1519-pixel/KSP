"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { BMICategory, BMI_CATEGORY_LABELS } from "@/constants/bmi";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CreateStaffModal } from "@/components/dashboard/CreateStaffModal";

import { getStaffByPrison, getPrisonHeadProfile, updateUserProfile } from "@/services/user";
import { getPendingDietPlans, approveDietPlan, rejectDietPlan } from "@/services/diet";
import { getPendingExercisePlans, approveExercisePlan, rejectExercisePlan } from "@/services/exercise";
import { getLatestHealthLog, getHealthLogs, type HealthLog } from "@/services/health";
import { getDocument } from "@/lib/firebase/firestore";
import { calculateBMI, classifyBMI } from "@/lib/utils/bmi";
import { createAlert } from "@/services/notifications";

import type { StaffProfile, PrisonHead } from "@/types/user";
import type { StoredDietPlan } from "@/types/diet";
import type { StoredExercisePlan } from "@/types/exercise";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── KSP BMI Badge styles ──────────────────────────────────────────

const BMI_BADGE: Record<BMICategory, { bg: string; text: string }> = {
  [BMICategory.UNDERWEIGHT]: { bg: "#E6F1FB", text: "#0C447C" },
  [BMICategory.NORMAL]: { bg: "#EAF3DE", text: "#27500A" },
  [BMICategory.OVERWEIGHT]: { bg: "#FAEEDA", text: "#633806" },
  [BMICategory.OBESE_1]: { bg: "#FAECE7", text: "#4A1B0C" },
  [BMICategory.OBESE_2]: { bg: "#FCEBEB", text: "#501313" },
};

// ─── Helpers ────────────────────────────────────────────────────────

function toJsDate(value: unknown): Date {
  if (value && typeof value === "object" && "seconds" in (value as object)) {
    return new Date(((value as { seconds: number }).seconds) * 1000);
  }
  return new Date(value as string | number | Date);
}

// ─── Types ──────────────────────────────────────────────────────────

interface PendingItem {
  planId: string;
  planType: "diet" | "exercise";
  staffUid: string;
  staffName: string;
  staffNameKn: string;
  bmiCategory: BMICategory;
  generatedAt: Date;
}

interface StaffWithHealth extends StaffProfile {
  latestBmi?: number;
  latestBmiCategory?: BMICategory;
  lastCheckIn?: Date;
}

// ═══════════════════════════════════════════════════════════════════
// Dashboard Content
// ═══════════════════════════════════════════════════════════════════

function HeadDashboardContent() {
  const { user, firebaseUser } = useAuth();

  const [prisonHead, setPrisonHead] = useState<PrisonHead | null>(null);
  const [staffList, setStaffList] = useState<StaffWithHealth[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bmiFilter, setBmiFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drawer
  const [selectedStaff, setSelectedStaff] = useState<StaffWithHealth | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHealthLogs, setDrawerHealthLogs] = useState<HealthLog[]>([]);
  const [drawerDiet, setDrawerDiet] = useState<StoredDietPlan | null>(null);
  const [drawerExercise, setDrawerExercise] = useState<StoredExercisePlan | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<PendingItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Regenerate
  const [regenerating, setRegenerating] = useState(false);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // ─── Data Fetching ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const headProfile = await getPrisonHeadProfile(user.uid);
      if (!headProfile || !headProfile.prisonId) return;
      setPrisonHead(headProfile);

      const staff = await getStaffByPrison(headProfile.prisonId);

      const enriched: StaffWithHealth[] = await Promise.all(
        staff.map(async (s) => {
          const log = await getLatestHealthLog(s.uid);
          return {
            ...s,
            latestBmi: log?.bmi ?? (s.heightCm && s.currentWeightKg ? calculateBMI(s.currentWeightKg, s.heightCm) : undefined),
            latestBmiCategory: log?.bmiCategory ?? (s.heightCm && s.currentWeightKg ? classifyBMI(calculateBMI(s.currentWeightKg, s.heightCm)) : undefined),
            lastCheckIn: log?.timestamp,
          };
        })
      );
      setStaffList(enriched);

      const staffUids = staff.map((s) => s.uid);
      if (staffUids.length > 0) {
        const [pendingDiets, pendingExercises] = await Promise.all([
          getPendingDietPlans(staffUids),
          getPendingExercisePlans(staffUids),
        ]);

        const items: PendingItem[] = [];
        for (const p of pendingDiets) {
          const s = enriched.find((x) => x.uid === p.userId);
          if (s) {
            items.push({
              planId: p.id,
              planType: "diet",
              staffUid: p.userId,
              staffName: s.fullNameEn || s.displayName,
              staffNameKn: s.fullNameKn || "",
              bmiCategory: s.latestBmiCategory ?? BMICategory.NORMAL,
              generatedAt: p.generatedAt,
            });
          }
        }
        for (const p of pendingExercises) {
          const s = enriched.find((x) => x.uid === p.userId);
          if (s) {
            items.push({
              planId: p.id,
              planType: "exercise",
              staffUid: p.userId,
              staffName: s.fullNameEn || s.displayName,
              staffNameKn: s.fullNameKn || "",
              bmiCategory: s.latestBmiCategory ?? BMICategory.NORMAL,
              generatedAt: p.generatedAt,
            });
          }
        }
        setPendingItems(items);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Drawer ─────────────────────────────────────────────────────
  async function openStaffDrawer(staff: StaffWithHealth) {
    setSelectedStaff(staff);
    setDrawerOpen(true);
    setDrawerLoading(true);

    try {
      const [logs, diet, exercise] = await Promise.all([
        getHealthLogs(staff.uid, 20),
        getDocument<StoredDietPlan>("diet_plans", `${staff.uid}_draft`),
        getDocument<StoredExercisePlan>("exercise_plans", `${staff.uid}_draft`),
      ]);
      setDrawerHealthLogs(logs);
      setDrawerDiet(diet);
      setDrawerExercise(exercise);
    } finally {
      setDrawerLoading(false);
    }
  }

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
        `Your ${item.planType} plan has been approved.`,
        `ನಿಮ್ಮ ${item.planType === "diet" ? "ಆಹಾರ" : "ವ್ಯಾಯಾಮ"} ಯೋಜನೆಯನ್ನು ಅನುಮೋದಿಸಲಾಗಿದೆ.`
      );
      setToastMessage("✅ ಅನುಮೋದಿಸಲಾಗಿದೆ / Approved");
      setPendingItems((prev) => prev.filter((p) => p.planId !== item.planId));
    } catch {
      setToastMessage("❌ ಅನುಮೋದನೆ ವಿಫಲ / Approval failed");
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
        `ನಿಮ್ಮ ${rejectModal.planType === "diet" ? "ಆಹಾರ" : "ವ್ಯಾಯಾಮ"} ಯೋಜನೆಯನ್ನು ತಿರಸ್ಕರಿಸಲಾಗಿದೆ.`
      );
      setToastMessage("❌ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ / Rejected");
      setPendingItems((prev) => prev.filter((p) => p.planId !== rejectModal.planId));
      setRejectModal(null);
      setRejectReason("");
    } catch {
      setToastMessage("❌ ತಿರಸ್ಕರಣೆ ವಿಫಲ / Rejection failed");
    }
  }

  async function handleRegeneratePlans() {
    if (!selectedStaff || !firebaseUser) return;
    setRegenerating(true);
    setToastMessage("ಯೋಜನೆ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ / Generating plans...");

    try {
      const idToken = await firebaseUser.getIdToken();
      const headers = { Authorization: `Bearer ${idToken}` };

      await Promise.all([
        fetch("/api/diet/generate", { method: "POST", headers }),
        fetch("/api/exercise/generate", { method: "POST", headers }),
      ]);

      setToastMessage("✅ ಯೋಜನೆ ಸಿದ್ಧವಾಗಿದೆ / Plans generated");
      await fetchData();
    } catch {
      setToastMessage("❌ ಯೋಜನೆ ರಚಿಸಲು ವಿಫಲ / Failed to generate");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleFlagMedical(staffUid: string) {
    try {
      await updateUserProfile(staffUid, { flaggedForMedicalReview: true });
      await createAlert(
        staffUid,
        "medical_review",
        "You have been flagged for medical review. Please contact your supervisor.",
        "ನಿಮ್ಮನ್ನು ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸಲಾಗಿದೆ."
      );
      setToastMessage("🏥 ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆಗೆ ಗುರುತಿಸಲಾಗಿದೆ / Flagged for medical review");
    } catch {
      setToastMessage("❌ ಗುರುತಿಸಲು ವಿಫಲ / Failed to flag");
    }
  }

  // ─── Computed ───────────────────────────────────────────────────
  const stats = {
    total: staffList.length,
    normal: staffList.filter((s) => s.latestBmiCategory === BMICategory.NORMAL).length,
    attention: staffList.filter((s) =>
      s.latestBmiCategory && [BMICategory.OVERWEIGHT, BMICategory.OBESE_1, BMICategory.OBESE_2].includes(s.latestBmiCategory)
    ).length,
    pending: pendingItems.length,
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.fullNameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullNameKn?.includes(searchQuery) ||
      s.badgeNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBmi = bmiFilter === "all" || s.latestBmiCategory === bmiFilter;
    return matchesSearch && matchesBmi;
  });

  const chartData = drawerHealthLogs
    .slice()
    .reverse()
    .map((log) => ({
      date: toJsDate(log.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      bmi: log.bmi,
    }));

  // ─── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

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
            {prisonHead?.prisonName || "Dashboard"}
          </h1>
          <p className="text-[12px]" style={{ color: "#6b7280" }}>
            <span className="font-kannada">ಕಾರಾಗೃಹ ಮುಖ್ಯಸ್ಥ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್</span>
            <span className="ml-1">· Prison Head Dashboard</span>
          </p>
        </div>

        {/* ═══ Stats ═══════════════════════════════════ */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="ಒಟ್ಟು ಸಿಬ್ಬಂದಿ" labelEn="Total Staff" value={stats.total} icon="👥" />
          <StatCard label="ಸಾಮಾನ್ಯ BMI" labelEn="Normal BMI" value={stats.normal} icon="💚" valueColor="#3B6D11" />
          <StatCard label="ಗಮನ ಬೇಕು" labelEn="Needs Attention" value={stats.attention} icon="⚠️" valueColor="#BA7517" />
          <StatCard label="ಅನುಮೋದನೆ ಬಾಕಿ" labelEn="Pending Approvals" value={stats.pending} icon="📋" />
        </div>

        {/* ═══ Pending Approvals ════════════════════════ */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <h2 className="mb-3 text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
            <span className="font-kannada">ಅನುಮೋದನೆ ಬಾಕಿ ಯೋಜನೆಗಳು</span>
            <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>Pending Approvals</span>
          </h2>
          {pendingItems.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-2xl">✅</span>
              <p className="mt-1 font-kannada text-[12px]" style={{ color: "#6b7280" }}>ಯಾವುದೇ ಬಾಕಿ ಯೋಜನೆಗಳಿಲ್ಲ</p>
              <p className="text-[11px]" style={{ color: "#6b7280" }}>No pending plans</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => {
                const badge = BMI_BADGE[item.bmiCategory];
                return (
                  <div
                    key={item.planId}
                    className="flex items-center justify-between rounded-lg p-3"
                    style={{ border: "0.5px solid #e5e7eb" }}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>
                          {item.staffNameKn || item.staffName}
                        </p>
                        <p className="text-[10px]" style={{ color: "#6b7280" }}>{item.staffName}</p>
                      </div>
                      <Badge className="text-[10px]" style={{ backgroundColor: badge.bg, color: badge.text, border: "none" }}>
                        {BMI_CATEGORY_LABELS[item.bmiCategory]}
                      </Badge>
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
                        <span className="font-kannada">ಅನುಮೋದಿಸಿ</span>
                        <span className="ml-1 hidden sm:inline">Approve</span>
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
                        <span className="font-kannada">ತಿರಸ್ಕರಿಸಿ</span>
                        <span className="ml-1 hidden sm:inline">Reject</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ Staff Table ══════════════════════════════ */}
        <div className="rounded-xl bg-white shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          <div className="flex flex-col gap-3 p-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[13px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              <span className="font-kannada">ಸಿಬ್ಬಂದಿ ಪಟ್ಟಿ</span>
              <span className="ml-1 text-[11px]" style={{ color: "#6b7280" }}>Staff List</span>
            </h2>
            <div className="flex gap-2">
              <Input
                placeholder="🔍 Search name / badge"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-44 rounded-lg border-[0.5px] text-[11px]"
                style={{ borderColor: "#e5e7eb" }}
                id="staffSearch"
              />
              <Select value={bmiFilter} onValueChange={setBmiFilter}>
                <SelectTrigger className="h-8 w-36 rounded-lg border-[0.5px] text-[11px]" style={{ borderColor: "#e5e7eb" }} id="bmiFilter">
                  <SelectValue placeholder="All BMI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All BMI</SelectItem>
                  {Object.values(BMICategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {BMI_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CreateStaffModal onStaffCreated={fetchData} />
            </div>
          </div>
          <div className="mobile-scroll">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#F5F6FA" }}>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Name</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Badge</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Rank</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>BMI</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Category</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Last Check-in</TableHead>
                  <TableHead className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <span className="text-2xl">👥</span>
                      <p className="mt-1 text-[12px]" style={{ color: "#6b7280" }}>
                        {searchQuery || bmiFilter !== "all" ? "No staff matching filters" : "No staff members yet"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => {
                    const badge = staff.latestBmiCategory ? BMI_BADGE[staff.latestBmiCategory] : null;
                    return (
                      <TableRow
                        key={staff.uid}
                        className="cursor-pointer transition-colors hover:bg-[#fafbff]"
                        onClick={() => openStaffDrawer(staff)}
                      >
                        <TableCell className="py-2">
                          <p className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>
                            {staff.fullNameKn || "—"}
                          </p>
                          <p className="text-[10px]" style={{ color: "#6b7280" }}>
                            {staff.fullNameEn || staff.displayName}
                          </p>
                        </TableCell>
                        <TableCell className="text-[11px]" style={{ color: "#6b7280" }}>{staff.badgeNumber || "—"}</TableCell>
                        <TableCell className="text-[11px]" style={{ color: "#6b7280" }}>{staff.rank || "—"}</TableCell>
                        <TableCell>
                          {staff.latestBmi ? (
                            <span className="text-[13px] font-medium" style={{ color: badge?.text || "#1A3C6B" }}>
                              {staff.latestBmi.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[11px]" style={{ color: "#e5e7eb" }}>—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {staff.latestBmiCategory && badge ? (
                            <Badge className="text-[10px]" style={{ backgroundColor: badge.bg, color: badge.text, border: "none" }}>
                              {BMI_CATEGORY_LABELS[staff.latestBmiCategory]}
                            </Badge>
                          ) : (
                            <span className="text-[11px]" style={{ color: "#e5e7eb" }}>—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px]" style={{ color: "#6b7280" }}>
                          {staff.lastCheckIn
                            ? toJsDate(staff.lastCheckIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              borderColor: staff.status === "inactive" ? "#A32D2D" : "#3B6D11",
                              color: staff.status === "inactive" ? "#A32D2D" : "#3B6D11",
                            }}
                          >
                            {staff.status === "inactive" ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ═══ Staff Detail Drawer ═════════════════════════════════ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              <span className="font-kannada" style={{ color: "#1A3C6B" }}>ಸಿಬ್ಬಂದಿ ವಿವರ</span>
              <span className="ml-2 text-[12px] font-normal" style={{ color: "#6b7280" }}>Staff Detail</span>
            </SheetTitle>
          </SheetHeader>

          {drawerLoading ? (
            <div className="space-y-4 pt-6">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : selectedStaff ? (
            <div className="space-y-5 pt-4">
              {/* Profile */}
              <div className="rounded-xl p-4" style={{ border: "0.5px solid #e5e7eb" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-kannada text-[14px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
                      {selectedStaff.fullNameKn || "—"}
                    </h3>
                    <p className="text-[12px]" style={{ color: "#6b7280" }}>{selectedStaff.fullNameEn}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: "#e5e7eb" }}>{selectedStaff.badgeNumber}</Badge>
                    <Badge className="text-[10px] text-white" style={{ backgroundColor: "#1A3C6B" }}>{selectedStaff.rank}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "#F5F6FA" }}>
                    <span style={{ color: "#6b7280" }}>Duty: </span>
                    <span className="font-medium capitalize" style={{ color: "#1a1a2e" }}>{selectedStaff.dutyType}</span>
                  </div>
                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "#F5F6FA" }}>
                    <span style={{ color: "#6b7280" }}>Diet: </span>
                    <span className="font-medium capitalize" style={{ color: "#1a1a2e" }}>
                      {selectedStaff.dietPreference === "veg" ? "🥬 Veg" : "🍗 Non-Veg"}
                    </span>
                  </div>
                  {selectedStaff.latestBmi && selectedStaff.latestBmiCategory && (
                    <div
                      className="col-span-2 rounded-lg px-2 py-1.5"
                      style={{ backgroundColor: BMI_BADGE[selectedStaff.latestBmiCategory].bg }}
                    >
                      <span className="font-medium" style={{ color: BMI_BADGE[selectedStaff.latestBmiCategory].text }}>
                        BMI: {selectedStaff.latestBmi.toFixed(1)} — {BMI_CATEGORY_LABELS[selectedStaff.latestBmiCategory]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BMI Trend */}
              {chartData.length > 1 && (
                <div className="rounded-xl p-4" style={{ border: "0.5px solid #e5e7eb" }}>
                  <h4 className="mb-3 text-[12px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
                    <span className="font-kannada">BMI ಪ್ರವೃತ್ತಿ</span>
                    <span className="ml-1 text-[10px]" style={{ color: "#6b7280" }}>BMI Trend</span>
                  </h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="bmi" stroke="#1A3C6B" strokeWidth={2} dot={{ r: 4, fill: "#1A3C6B" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Current Plans */}
              <div className="space-y-2">
                {drawerDiet && drawerDiet.status === "approved" && (
                  <div className="rounded-xl p-3" style={{ backgroundColor: "#EAF3DE", border: "0.5px solid #3B6D1130" }}>
                    <p className="text-[12px] font-medium" style={{ color: "#27500A" }}>
                      🍽️ <span className="font-kannada">ಆಹಾರ ಯೋಜನೆ</span> · Diet Plan
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: "#3B6D11" }}>
                      {drawerDiet.plan.weeklyCalorieTarget} cal/week target · {drawerDiet.plan.dailyWaterLitres}L water/day
                    </p>
                  </div>
                )}
                {drawerExercise && drawerExercise.status === "approved" && (
                  <div className="rounded-xl p-3" style={{ backgroundColor: "#E6F1FB", border: "0.5px solid #185FA530" }}>
                    <p className="text-[12px] font-medium" style={{ color: "#0C447C" }}>
                      🏋️ <span className="font-kannada">ವ್ಯಾಯಾಮ ಯೋಜನೆ</span> · Exercise Plan
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: "#185FA5" }}>
                      {drawerExercise.plan.weeklyPlan.filter((d) => !d.restDay).length} workout days/week
                    </p>
                  </div>
                )}
                {(!drawerDiet || drawerDiet.status !== "approved") &&
                  (!drawerExercise || drawerExercise.status !== "approved") && (
                    <p className="text-center text-[11px]" style={{ color: "#6b7280" }}>No approved plans yet</p>
                  )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 rounded-lg text-[11px] text-white"
                  style={{ backgroundColor: regenerating ? "#94a3b8" : "#1A3C6B" }}
                  disabled={regenerating}
                  onClick={handleRegeneratePlans}
                >
                  {regenerating ? "Generating..." : "🤖 Regenerate Plans"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-lg text-[11px]"
                  style={{ backgroundColor: "#FAEEDA", color: "#633806" }}
                  onClick={() => handleFlagMedical(selectedStaff.uid)}
                >
                  🏥 Flag Medical
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ═══ Reject Modal ═════════════════════════════════════════ */}
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
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
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
                <span className="font-kannada">ತಿರಸ್ಕರಿಸಿ</span>
                <span className="ml-1">Reject</span>
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
  value: number;
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

export default function PrisonHeadDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.PRISON_HEAD]}>
      <DashboardLayout>
        <HeadDashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
