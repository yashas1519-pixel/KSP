"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { RANKS, type Rank } from "@/types/user";
import { getAllPrisons, type Prison } from "@/services/prisons";

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

const createPrisonHeadSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  fullNameKn: z.string().min(2, "ಹೆಸರು ಕನಿಷ್ಠ 2 ಅಕ್ಷರಗಳು"),
  email: z.string().email("Invalid email"),
  prisonId: z.string().min(1, "Prison is required"),
  badgeNumber: z.string().min(1, "Badge number is required"),
  rank: z.string().optional(),
  designation: z.string().min(1, "Designation is required"),
});

interface CreatePrisonHeadModalProps {
  preselectedPrisonId?: string;
  onCreated?: () => void;
}

export function CreatePrisonHeadModal({ preselectedPrisonId, onCreated }: CreatePrisonHeadModalProps) {
  const { firebaseUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [prisons, setPrisons] = useState<Prison[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    fullNameKn: "",
    email: "",
    prisonId: preselectedPrisonId || "",
    badgeNumber: "",
    rank: "",
    designation: "Superintendent",
  });

  useEffect(() => {
    getAllPrisons(100).then(setPrisons);
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setForm({
      fullName: "",
      fullNameKn: "",
      email: "",
      prisonId: preselectedPrisonId || "",
      badgeNumber: "",
      rank: "",
      designation: "Superintendent",
    });
    setErrors({});
    setToastMessage(null);
  }

  async function handleSubmit() {
    const result = createPrisonHeadSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!firebaseUser) return;
    setIsSubmitting(true);

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch("/api/admin/create-prison-head", {
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

      setToastMessage("✅ ಕಾರಾಗೃಹ ಮುಖ್ಯಸ್ಥ ರಚಿಸಲಾಗಿದೆ / Prison Head created");
      onCreated?.();
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 1500);
    } catch {
      setToastMessage("❌ ರಚಿಸಲು ವಿಫಲ / Failed to create");
    } finally {
      setIsSubmitting(false);
    }
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
          size="sm"
          variant="outline"
          className="h-7 border-[#1A3C6B] text-xs text-[#1A3C6B]"
        >
          👤 Add Head
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="font-kannada">ಹೊಸ ಕಾರಾಗೃಹ ಮುಖ್ಯಸ್ಥ</span>
            <span className="ml-2 text-sm font-normal text-slate-500">New Prison Head</span>
          </DialogTitle>
        </DialogHeader>

        {toastMessage && (
          <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
            toastMessage.startsWith("❌") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}>
            {toastMessage}
          </div>
        )}

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="createHead-fullName">
              <span className="font-kannada">ಹೆಸರು (English)</span>
              <span className="ml-1 text-slate-500">Full Name (EN)</span>
            </Label>
            <Input
              id="createHead-fullName"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Rajesh Kumar"
            />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="createHead-fullNameKn">
              <span className="font-kannada">ಹೆಸರು (ಕನ್ನಡ)</span>
              <span className="ml-1 text-slate-500">Full Name (KN)</span>
            </Label>
            <Input
              id="createHead-fullNameKn"
              value={form.fullNameKn}
              onChange={(e) => updateField("fullNameKn", e.target.value)}
              placeholder="ರಾಜೇಶ್ ಕುಮಾರ್"
            />
            {errors.fullNameKn && <p className="text-xs text-red-500">{errors.fullNameKn}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="createHead-email">
              <span className="font-kannada">ಇಮೇಲ್</span>
              <span className="ml-1 text-slate-500">Email</span>
            </Label>
            <Input
              id="createHead-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="head@ksp.gov.in"
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              <span className="font-kannada">ಕಾರಾಗೃಹ</span>
              <span className="ml-1 text-slate-500">Prison</span>
            </Label>
            <Select value={form.prisonId} onValueChange={(v) => updateField("prisonId", v)}>
              <SelectTrigger id="createHead-prison">
                <SelectValue placeholder="Select prison" />
              </SelectTrigger>
              <SelectContent>
                {prisons.map((p) => (
                  <SelectItem key={p.prisonId} value={p.prisonId}>
                    {p.prisonNameKn} · {p.prisonName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.prisonId && <p className="text-xs text-red-500">{errors.prisonId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="createHead-badge">
                <span className="font-kannada">ಬ್ಯಾಡ್ಜ್</span>
                <span className="ml-1 text-slate-500">Badge</span>
              </Label>
              <Input
                id="createHead-badge"
                value={form.badgeNumber}
                onChange={(e) => updateField("badgeNumber", e.target.value)}
                placeholder="KSP-001"
              />
              {errors.badgeNumber && <p className="text-xs text-red-500">{errors.badgeNumber}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>
                <span className="font-kannada">ಹುದ್ದೆ</span>
                <span className="ml-1 text-slate-500">Rank</span>
              </Label>
              <Select value={form.rank} onValueChange={(v) => updateField("rank", v)}>
                <SelectTrigger id="createHead-rank">
                  <SelectValue placeholder="Rank" />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map((r: Rank) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="createHead-designation">
              <span className="font-kannada">ಪದನಾಮ</span>
              <span className="ml-1 text-slate-500">Designation</span>
            </Label>
            <Input
              id="createHead-designation"
              value={form.designation}
              onChange={(e) => updateField("designation", e.target.value)}
              placeholder="Superintendent"
            />
            {errors.designation && <p className="text-xs text-red-500">{errors.designation}</p>}
          </div>

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
                <span className="font-kannada">ಮುಖ್ಯಸ್ಥ ರಚಿಸಿ</span>
                <span className="ml-1 text-xs opacity-75">Create Head</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
