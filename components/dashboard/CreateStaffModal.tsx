"use client";

import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { RANKS, type Rank, type DutyType } from "@/types/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Zod Schema ─────────────────────────────────────────────────────

const createStaffSchema = z.object({
  fullNameEn: z.string().min(2, "Name must be at least 2 characters"),
  fullNameKn: z.string().min(2, "ಹೆಸರು ಕನಿಷ್ಠ 2 ಅಕ್ಷರಗಳು ಬೇಕು"),
  email: z.string().email("Invalid email address"),
  badgeNumber: z.string().min(1, "Badge number is required"),
  rank: z.string().min(1, "Rank is required"),
  dutyType: z.enum(["field", "administrative"]),
});

type CreateStaffFormData = z.infer<typeof createStaffSchema>;

// ─── Component ──────────────────────────────────────────────────────

interface CreateStaffModalProps {
  onStaffCreated?: () => void;
}

export function CreateStaffModal({ onStaffCreated }: CreateStaffModalProps) {
  const { firebaseUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const [form, setForm] = useState<CreateStaffFormData>({
    fullNameEn: "",
    fullNameKn: "",
    email: "",
    badgeNumber: "",
    rank: "",
    dutyType: "field",
  });

  function updateField(field: keyof CreateStaffFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setForm({
      fullNameEn: "",
      fullNameKn: "",
      email: "",
      badgeNumber: "",
      rank: "",
      dutyType: "field",
    });
    setErrors({});
    setCreatedEmail(null);
  }

  async function handleSubmit() {
    // Validate
    const result = createStaffSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!firebaseUser) return;

    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(result.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setToastMessage(`❌ ${data.error}`);
        return;
      }

      setCreatedEmail(data.email);
      setToastMessage("ಸಿಬ್ಬಂದಿ ಖಾತೆ ರಚಿಸಲಾಗಿದೆ / Staff account created");
      onStaffCreated?.();
    } catch {
      setToastMessage("❌ ಖಾತೆ ರಚಿಸಲು ವಿಫಲವಾಗಿದೆ / Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyEmail() {
    if (!createdEmail) return;
    await navigator.clipboard.writeText(createdEmail);
    setToastMessage("📋 Email copied!");
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="h-9 text-white"
          style={{ backgroundColor: "#1A3C6B" }}
        >
          <span className="mr-1">➕</span>
          <span className="font-kannada">ಸಿಬ್ಬಂದಿ ಸೇರಿಸಿ</span>
          <span className="ml-1 text-xs opacity-75">Add Staff</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="font-kannada">ಹೊಸ ಸಿಬ್ಬಂದಿ ಖಾತೆ</span>
            <span className="ml-2 text-sm font-normal text-slate-500">
              New Staff Account
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Toast */}
        {toastMessage && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              toastMessage.startsWith("❌")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {toastMessage}
          </div>
        )}

        {/* Success state */}
        {createdEmail ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">
                <span className="font-kannada">ಖಾತೆ ರಚಿಸಲಾಗಿದೆ!</span> Account created!
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-1.5 text-sm text-slate-700">
                  {createdEmail}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyEmail}>
                  📋 Copy
                </Button>
              </div>
              <p className="mt-2 text-xs text-green-600">
                A password reset email has been sent to this address.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetForm();
                setToastMessage(null);
              }}
            >
              <span className="font-kannada">ಮತ್ತೊಂದು ಸೇರಿಸಿ</span>
              <span className="ml-1 text-xs text-slate-500">Add Another</span>
            </Button>
          </div>
        ) : (
          /* Form */
          <div className="space-y-4 pt-2">
            {/* Full Name (English) */}
            <div className="space-y-1.5">
              <Label htmlFor="createStaff-fullNameEn">
                <span className="font-kannada">ಹೆಸರು (English)</span>
                <span className="ml-1 text-slate-500">Full Name (EN)</span>
              </Label>
              <Input
                id="createStaff-fullNameEn"
                value={form.fullNameEn}
                onChange={(e) => updateField("fullNameEn", e.target.value)}
                placeholder="Rajesh Kumar"
              />
              {errors.fullNameEn && (
                <p className="text-xs text-red-500">{errors.fullNameEn}</p>
              )}
            </div>

            {/* Full Name (Kannada) */}
            <div className="space-y-1.5">
              <Label htmlFor="createStaff-fullNameKn">
                <span className="font-kannada">ಹೆಸರು (ಕನ್ನಡ)</span>
                <span className="ml-1 text-slate-500">Full Name (KN)</span>
              </Label>
              <Input
                id="createStaff-fullNameKn"
                value={form.fullNameKn}
                onChange={(e) => updateField("fullNameKn", e.target.value)}
                placeholder="ರಾಜೇಶ್ ಕುಮಾರ್"
              />
              {errors.fullNameKn && (
                <p className="text-xs text-red-500">{errors.fullNameKn}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="createStaff-email">
                <span className="font-kannada">ಇಮೇಲ್</span>
                <span className="ml-1 text-slate-500">Email</span>
              </Label>
              <Input
                id="createStaff-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="staff@ksp.gov.in"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Badge Number */}
            <div className="space-y-1.5">
              <Label htmlFor="createStaff-badgeNumber">
                <span className="font-kannada">ಬ್ಯಾಡ್ಜ್ ಸಂಖ್ಯೆ</span>
                <span className="ml-1 text-slate-500">Badge No.</span>
              </Label>
              <Input
                id="createStaff-badgeNumber"
                value={form.badgeNumber}
                onChange={(e) => updateField("badgeNumber", e.target.value)}
                placeholder="KSP-1234"
              />
              {errors.badgeNumber && (
                <p className="text-xs text-red-500">{errors.badgeNumber}</p>
              )}
            </div>

            {/* Rank */}
            <div className="space-y-1.5">
              <Label>
                <span className="font-kannada">ಹುದ್ದೆ</span>
                <span className="ml-1 text-slate-500">Rank</span>
              </Label>
              <Select
                value={form.rank}
                onValueChange={(v) => updateField("rank", v)}
              >
                <SelectTrigger id="createStaff-rank">
                  <SelectValue placeholder="Select rank" />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map((r: Rank) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rank && (
                <p className="text-xs text-red-500">{errors.rank}</p>
              )}
            </div>

            {/* Duty Type */}
            <div className="space-y-1.5">
              <Label>
                <span className="font-kannada">ಕರ್ತವ್ಯ ಪ್ರಕಾರ</span>
                <span className="ml-1 text-slate-500">Duty Type</span>
              </Label>
              <div className="flex gap-3">
                {(["field", "administrative"] as DutyType[]).map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => updateField("dutyType", dt)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      form.dutyType === dt
                        ? "border-[#1A3C6B] bg-blue-50 text-[#1A3C6B]"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {dt === "field" ? "🏃 Field" : "📋 Administrative"}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full text-white"
              style={{ backgroundColor: isSubmitting ? "#94a3b8" : "#1A3C6B" }}
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="font-kannada">ರಚಿಸಲಾಗುತ್ತಿದೆ...</span>
                </>
              ) : (
                <>
                  <span className="font-kannada">ಖಾತೆ ರಚಿಸಿ</span>
                  <span className="ml-1 text-xs opacity-75">Create Account</span>
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
