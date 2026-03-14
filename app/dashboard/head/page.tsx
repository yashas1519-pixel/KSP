"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { BMICategory, BMI_CATEGORY_LABELS } from "@/constants/bmi";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CreateStaffModal } from "@/components/dashboard/CreateStaffModal";
import { Navbar } from "@/components/dashboard/Navbar";

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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

// ─── Helpers ────────────────────────────────────────────────────────

/** Convert a Firestore Timestamp-like or Date to a JS Date */
function toJsDate(value: unknown): Date {
  if (value && typeof value === "object" && "seconds" in (value as object)) {
    return new Date(((value as { seconds: number }).seconds) * 1000);
  }
  return new Date(value as string | number | Date);
}

const BMI_COLORS: Record<BMICategory, { bg: string; text: string; ring: string }> = {
  [BMICategory.UNDERWEIGHT]: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
  [BMICategory.NORMAL]: { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-200" },
  [BMICategory.OVERWEIGHT]: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  [BMICategory.OBESE_1]: { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-200" },
  [BMICategory.OBESE_2]: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-200" },
};

// ─── Types for pending items ────────────────────────────────────────

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
// Main Dashboard Content
// ═══════════════════════════════════════════════════════════════════

function HeadDashboardContent() {
  const { user, firebaseUser } = useAuth();

  // ─── State ──────────────────────────────────────────────────────
  const [prisonHead, setPrisonHead] = useState<PrisonHead | null>(null);
  const [staffList, setStaffList] = useState<StaffWithHealth[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bmiFilter, setBmiFilter] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drawer state
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

  // ─── Toast auto-dismiss ─────────────────────────────────────────
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

      // Fetch staff for this prison
      const staff = await getStaffByPrison(headProfile.prisonId);

      // Enrich with latest health data
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

      // Fetch pending plans
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Drawer — open staff detail ─────────────────────────────────
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
      // Send notification to staff
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

  // ─── Chart data for drawer ──────────────────────────────────────
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-kannada text-xl font-bold" style={{ color: "#1A3C6B" }}>
              {prisonHead?.prisonName || "Dashboard"}
            </h1>
            <p className="text-sm text-slate-500">
              <span className="font-kannada">ಕಾರಾಗೃಹ ಮುಖ್ಯಸ್ಥ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್</span>
              <span className="ml-1">· Prison Head Dashboard</span>
            </p>
          </div>
        </div>

        {/* ═══ Section A — Stats ══════════════════════════════════ */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="ಒಟ್ಟು ಸಿಬ್ಬಂದಿ"
            labelEn="Total Staff"
            value={stats.total}
            icon="👥"
            color="bg-slate-100 text-slate-700"
          />
          <StatCard
            label="ಸಾಮಾನ್ಯ BMI"
            labelEn="Normal BMI"
            value={stats.normal}
            icon="💚"
            color="bg-green-50 text-green-700"
          />
          <StatCard
            label="ಗಮನ ಬೇಕು"
            labelEn="Needs Attention"
            value={stats.attention}
            icon="⚠️"
            color="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="ಅನುಮೋದನೆ ಬಾಕಿ"
            labelEn="Pending Approvals"
            value={stats.pending}
            icon="📋"
            color="bg-purple-50 text-purple-700"
          />
        </div>

        {/* ═══ Section B — Pending Approvals ══════════════════════ */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              <span className="font-kannada">ಅನುಮೋದನೆ ಬಾಕಿ ಯೋಜನೆಗಳು</span>
              <span className="ml-1 text-slate-400">Pending Approvals</span>
            </h2>
          </CardHeader>
          <CardContent>
            {pendingItems.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-3xl">✅</span>
                <p className="mt-2 text-sm text-slate-400">
                  <span className="font-kannada">ಯಾವುದೇ ಬಾಕಿ ಯೋಜನೆಗಳಿಲ್ಲ</span>
                  <br />
                  No pending plans
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.map((item) => {
                  const bmiColor = BMI_COLORS[item.bmiCategory];
                  return (
                    <div
                      key={item.planId}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {item.staffNameKn || item.staffName}
                          </p>
                          <p className="text-xs text-slate-400">{item.staffName}</p>
                        </div>
                        <Badge className={`${bmiColor.bg} ${bmiColor.text} text-[10px]`}>
                          {BMI_CATEGORY_LABELS[item.bmiCategory]}
                        </Badge>
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
                          <span className="font-kannada">ಅನುಮೋದಿಸಿ</span>
                          <span className="ml-1 hidden sm:inline">Approve</span>
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
                          <span className="font-kannada">ತಿರಸ್ಕರಿಸಿ</span>
                          <span className="ml-1 hidden sm:inline">Reject</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ Section C — Staff Table ════════════════════════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                <span className="font-kannada">ಸಿಬ್ಬಂದಿ ಪಟ್ಟಿ</span>
                <span className="ml-1 text-slate-400">Staff List</span>
              </h2>
              <div className="flex gap-2">
                <Input
                  placeholder="🔍 Search name / badge"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-44 text-xs"
                  id="staffSearch"
                />
                <Select value={bmiFilter} onValueChange={setBmiFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs" id="bmiFilter">
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
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Badge</TableHead>
                    <TableHead className="text-xs">Rank</TableHead>
                    <TableHead className="text-xs">BMI</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Last Check-in</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-400">
                        {searchQuery || bmiFilter !== "all"
                          ? "No staff matching filters"
                          : "No staff members yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => {
                      const bmiColor = staff.latestBmiCategory
                        ? BMI_COLORS[staff.latestBmiCategory]
                        : null;

                      return (
                        <TableRow
                          key={staff.uid}
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                          onClick={() => openStaffDrawer(staff)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-kannada text-sm font-medium text-slate-800">
                                {staff.fullNameKn || "—"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {staff.fullNameEn || staff.displayName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {staff.badgeNumber || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {staff.rank || "—"}
                          </TableCell>
                          <TableCell>
                            {staff.latestBmi ? (
                              <span className={`text-sm font-semibold ${bmiColor?.text || ""}`}>
                                {staff.latestBmi.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {staff.latestBmiCategory && bmiColor ? (
                              <Badge className={`${bmiColor.bg} ${bmiColor.text} text-[10px]`}>
                                {BMI_CATEGORY_LABELS[staff.latestBmiCategory]}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {staff.lastCheckIn
                              ? toJsDate(staff.lastCheckIn).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                staff.status === "inactive"
                                  ? "border-red-200 text-red-500"
                                  : "border-green-200 text-green-600"
                              }`}
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
          </CardContent>
        </Card>
      </div>

      {/* ═══ Section D — Staff Detail Drawer ══════════════════════ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              <span className="font-kannada">ಸಿಬ್ಬಂದಿ ವಿವರ</span>
              <span className="ml-2 text-sm font-normal text-slate-400">Staff Detail</span>
            </SheetTitle>
          </SheetHeader>

          {drawerLoading ? (
            <div className="space-y-4 pt-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedStaff ? (
            <div className="space-y-5 pt-4">
              {/* Profile info */}
              <div className="rounded-lg border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-kannada text-lg font-bold" style={{ color: "#1A3C6B" }}>
                      {selectedStaff.fullNameKn || "—"}
                    </h3>
                    <p className="text-sm text-slate-500">{selectedStaff.fullNameEn}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">{selectedStaff.badgeNumber}</Badge>
                    <Badge className="text-xs text-white" style={{ backgroundColor: "#1A3C6B" }}>
                      {selectedStaff.rank}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-slate-50 px-2 py-1.5">
                    <span className="text-slate-400">Duty: </span>
                    <span className="font-medium capitalize text-slate-700">{selectedStaff.dutyType}</span>
                  </div>
                  <div className="rounded bg-slate-50 px-2 py-1.5">
                    <span className="text-slate-400">Diet: </span>
                    <span className="font-medium capitalize text-slate-700">
                      {selectedStaff.dietPreference === "veg" ? "🥬 Veg" : "🍗 Non-Veg"}
                    </span>
                  </div>
                  {selectedStaff.latestBmi && selectedStaff.latestBmiCategory && (
                    <div
                      className={`col-span-2 rounded px-2 py-1.5 ${
                        BMI_COLORS[selectedStaff.latestBmiCategory].bg
                      }`}
                    >
                      <span className={`font-semibold ${BMI_COLORS[selectedStaff.latestBmiCategory].text}`}>
                        BMI: {selectedStaff.latestBmi.toFixed(1)} — {BMI_CATEGORY_LABELS[selectedStaff.latestBmiCategory]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BMI Trend Chart */}
              {chartData.length > 1 && (
                <div className="rounded-lg border border-slate-100 p-4">
                  <h4 className="mb-3 text-xs font-semibold text-slate-600">
                    <span className="font-kannada">BMI ಪ್ರವೃತ್ತಿ</span>
                    <span className="ml-1 text-slate-400">BMI Trend</span>
                  </h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="bmi"
                        stroke="#1A3C6B"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#1A3C6B" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Current Plans */}
              <div className="space-y-2">
                {drawerDiet && drawerDiet.status === "approved" && (
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                    <p className="text-xs font-semibold text-green-700">
                      🍽️ <span className="font-kannada">ಆಹಾರ ಯೋಜನೆ</span> · Diet Plan
                    </p>
                    <p className="mt-1 text-[10px] text-green-600">
                      {drawerDiet.plan.weeklyCalorieTarget} cal/week target ·{" "}
                      {drawerDiet.plan.dailyWaterLitres}L water/day
                    </p>
                  </div>
                )}
                {drawerExercise && drawerExercise.status === "approved" && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">
                      🏋️ <span className="font-kannada">ವ್ಯಾಯಾಮ ಯೋಜನೆ</span> · Exercise Plan
                    </p>
                    <p className="mt-1 text-[10px] text-blue-600">
                      {drawerExercise.plan.weeklyPlan.filter((d) => !d.restDay).length} workout days/week
                    </p>
                  </div>
                )}
                {(!drawerDiet || drawerDiet.status !== "approved") &&
                  (!drawerExercise || drawerExercise.status !== "approved") && (
                    <p className="text-center text-xs text-slate-400">No approved plans yet</p>
                  )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs text-white"
                  style={{ backgroundColor: regenerating ? "#94a3b8" : "#1A3C6B" }}
                  disabled={regenerating}
                  onClick={handleRegeneratePlans}
                >
                  {regenerating ? "Generating..." : "🤖 Regenerate Plans"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-orange-200 text-xs text-orange-600 hover:bg-orange-50"
                  onClick={() => handleFlagMedical(selectedStaff.uid)}
                >
                  🏥 Flag Medical
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ═══ Reject Reason Modal ═════════════════════════════════ */}
      <Dialog open={!!rejectModal} onOpenChange={(v) => !v && setRejectModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <span className="font-kannada">ತಿರಸ್ಕರಣೆ ಕಾರಣ</span>
              <span className="ml-2 text-sm font-normal text-slate-500">
                Rejection Reason
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectModal(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
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
    </div>
  );
}

// ─── Stat Card subcomponent ─────────────────────────────────────────

function StatCard({
  label,
  labelEn,
  value,
  icon,
  color,
}: {
  label: string;
  labelEn: string;
  value: number;
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

export default function PrisonHeadDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.PRISON_HEAD]}>
      <HeadDashboardContent />
    </ProtectedRoute>
  );
}
