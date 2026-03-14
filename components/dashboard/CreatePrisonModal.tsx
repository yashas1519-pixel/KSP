"use client";

import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { KARNATAKA_DISTRICTS } from "@/constants/districts";

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

const createPrisonSchema = z.object({
  prisonName: z.string().min(3, "Prison name must be at least 3 characters"),
  prisonNameKn: z.string().min(3, "ಕಾರಾಗೃಹ ಹೆಸರು ಕನಿಷ್ಠ 3 ಅಕ್ಷರಗಳು"),
  district: z.string().min(1, "District is required"),
});

interface CreatePrisonModalProps {
  onPrisonCreated?: () => void;
}

export function CreatePrisonModal({ onPrisonCreated }: CreatePrisonModalProps) {
  const { firebaseUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    prisonName: "",
    prisonNameKn: "",
    district: "",
  });

  const selectedDistrict = KARNATAKA_DISTRICTS.find((d) => d.en === form.district);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setForm({ prisonName: "", prisonNameKn: "", district: "" });
    setErrors({});
    setToastMessage(null);
  }

  async function handleSubmit() {
    const result = createPrisonSchema.safeParse(form);
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
      const response = await fetch("/api/admin/create-prison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...result.data,
          districtKn: selectedDistrict?.kn || "",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setToastMessage(`❌ ${data.error}`);
        return;
      }

      setToastMessage("✅ ಕಾರಾಗೃಹ ರಚಿಸಲಾಗಿದೆ / Prison created");
      onPrisonCreated?.();
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 1500);
    } catch {
      setToastMessage("❌ ಕಾರಾಗೃಹ ರಚಿಸಲು ವಿಫಲ / Failed to create prison");
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
        <Button className="h-9 text-white" style={{ backgroundColor: "#1A3C6B" }}>
          <span className="mr-1">🏛️</span>
          <span className="font-kannada">ಕಾರಾಗೃಹ ಸೇರಿಸಿ</span>
          <span className="ml-1 text-xs opacity-75">Add Prison</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="font-kannada">ಹೊಸ ಕಾರಾಗೃಹ</span>
            <span className="ml-2 text-sm font-normal text-slate-500">New Prison</span>
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
            <Label htmlFor="createPrison-name">
              <span className="font-kannada">ಹೆಸರು (English)</span>
              <span className="ml-1 text-slate-500">Prison Name (EN)</span>
            </Label>
            <Input
              id="createPrison-name"
              value={form.prisonName}
              onChange={(e) => updateField("prisonName", e.target.value)}
              placeholder="Central Prison, Bangalore"
            />
            {errors.prisonName && <p className="text-xs text-red-500">{errors.prisonName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="createPrison-nameKn">
              <span className="font-kannada">ಹೆಸರು (ಕನ್ನಡ)</span>
              <span className="ml-1 text-slate-500">Prison Name (KN)</span>
            </Label>
            <Input
              id="createPrison-nameKn"
              value={form.prisonNameKn}
              onChange={(e) => updateField("prisonNameKn", e.target.value)}
              placeholder="ಕೇಂದ್ರ ಕಾರಾಗೃಹ, ಬೆಂಗಳೂರು"
            />
            {errors.prisonNameKn && <p className="text-xs text-red-500">{errors.prisonNameKn}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              <span className="font-kannada">ಜಿಲ್ಲೆ</span>
              <span className="ml-1 text-slate-500">District</span>
            </Label>
            <Select value={form.district} onValueChange={(v) => updateField("district", v)}>
              <SelectTrigger id="createPrison-district">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {KARNATAKA_DISTRICTS.map((d) => (
                  <SelectItem key={d.en} value={d.en}>
                    {d.kn} · {d.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.district && <p className="text-xs text-red-500">{errors.district}</p>}
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <span className="font-medium">Prison ID: </span>
            <code>{form.prisonName
              ? form.prisonName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
              : "—"}</code>
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
                <span className="font-kannada">ಕಾರಾಗೃಹ ರಚಿಸಿ</span>
                <span className="ml-1 text-xs opacity-75">Create Prison</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
