"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/services/user";
import { createHealthLog } from "@/services/health";
import { RANKS, BLOOD_GROUPS, EXISTING_CONDITIONS } from "@/types/user";
import type { DutyType, DietPreference, Rank, BloodGroup } from "@/types/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Zod schemas per step ───────────────────────────────────────────

const step1Schema = z.object({
  fullNameEn: z.string().min(2, "Name is required"),
  fullNameKn: z.string().min(2, "ಹೆಸರು ಅಗತ್ಯವಿದೆ"),
  badgeNumber: z.string().min(1, "Badge number is required"),
  rank: z.enum(RANKS as unknown as [string, ...string[]]),
  dutyType: z.enum(["field", "administrative"] as const),
  achievements: z.string().optional(),
});

const step2Schema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"] as const),
  bloodGroup: z.enum(BLOOD_GROUPS as unknown as [string, ...string[]]),
  heightCm: z.string().min(1, "Height is required"),
  currentWeightKg: z.string().min(1, "Weight is required"),
  waistCm: z.string().optional(),
  existingConditions: z.array(z.string()),
});

const step3Schema = z.object({
  dietPreference: z.enum(["veg", "non_veg"] as const),
  preferredLanguage: z.enum(["kn", "en"] as const),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

// ─── Step 1: Police Identity ────────────────────────────────────────

function Step1Form({
  form,
  onNext,
}: {
  form: UseFormReturn<Step1Data>;
  onNext: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="fullNameEn" className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಪೂರ್ಣ ಹೆಸರು (ಇಂಗ್ಲಿಷ್)</span>
          <span className="ml-2 text-slate-500">Full Name (English)</span>
        </label>
        <Input id="fullNameEn" {...register("fullNameEn")} placeholder="John Doe" />
        {errors.fullNameEn && <p className="text-xs text-red-500">{errors.fullNameEn.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fullNameKn" className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಪೂರ್ಣ ಹೆಸರು (ಕನ್ನಡ)</span>
          <span className="ml-2 text-slate-500">Full Name (Kannada)</span>
        </label>
        <Input id="fullNameKn" {...register("fullNameKn")} placeholder="ಜಾನ್ ಡೋ" className="font-kannada" />
        {errors.fullNameKn && <p className="text-xs text-red-500">{errors.fullNameKn.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="badgeNumber" className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಬ್ಯಾಡ್ಜ್ ಸಂಖ್ಯೆ</span>
          <span className="ml-2 text-slate-500">Badge Number</span>
        </label>
        <Input id="badgeNumber" {...register("badgeNumber")} placeholder="KSP-12345" />
        {errors.badgeNumber && <p className="text-xs text-red-500">{errors.badgeNumber.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="rank" className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಹುದ್ದೆ</span>
          <span className="ml-2 text-slate-500">Rank</span>
        </label>
        <select
          id="rank"
          {...register("rank")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select Rank</option>
          {RANKS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {errors.rank && <p className="text-xs text-red-500">{errors.rank.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಕರ್ತವ್ಯ ಪ್ರಕಾರ</span>
          <span className="ml-2 text-slate-500">Duty Type</span>
        </label>
        <div className="flex gap-3">
          {(["field", "administrative"] as const).map((dt) => (
            <label
              key={dt}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={dt}
                {...register("dutyType")}
                className="sr-only"
              />
              <span className="text-sm font-medium capitalize">{dt === "field" ? "Field" : "Administrative"}</span>
            </label>
          ))}
        </div>
        {errors.dutyType && <p className="text-xs text-red-500">{errors.dutyType.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="achievements" className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಸಾಧನೆಗಳು</span>
          <span className="ml-2 text-slate-500">Achievements</span>
        </label>
        <textarea
          id="achievements"
          {...register("achievements")}
          placeholder="Awards, medals, commendations..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button
        type="submit"
        className="h-11 w-full text-white"
        style={{ backgroundColor: "#1A3C6B" }}
      >
        ಮುಂದೆ / Next
      </Button>
    </form>
  );
}

// ─── Step 2: Health Details ─────────────────────────────────────────

function Step2Form({
  form,
  onNext,
  onBack,
}: {
  form: UseFormReturn<Step2Data>;
  onNext: () => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;
  const conditions = watch("existingConditions") || [];

  function toggleCondition(condition: string) {
    if (condition === "None") {
      setValue("existingConditions", ["None"]);
      return;
    }

    const filtered = conditions.filter((c) => c !== "None");
    if (filtered.includes(condition)) {
      setValue("existingConditions", filtered.filter((c) => c !== condition));
    } else {
      setValue("existingConditions", [...filtered, condition]);
    }
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="dateOfBirth" className="block text-sm font-medium">
            <span className="font-kannada text-slate-800">ಹುಟ್ಟಿದ ದಿನಾಂಕ</span>
            <span className="ml-1 text-slate-500">DOB</span>
          </label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gender" className="block text-sm font-medium">
            <span className="font-kannada text-slate-800">ಲಿಂಗ</span>
            <span className="ml-1 text-slate-500">Gender</span>
          </label>
          <select
            id="gender"
            {...register("gender")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bloodGroup" className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ರಕ್ತದ ಗುಂಪು</span>
          <span className="ml-2 text-slate-500">Blood Group</span>
        </label>
        <select
          id="bloodGroup"
          {...register("bloodGroup")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
        {errors.bloodGroup && <p className="text-xs text-red-500">{errors.bloodGroup.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="heightCm" className="block text-sm font-medium">
            <span className="font-kannada text-slate-800">ಎತ್ತರ</span>
            <span className="ml-1 text-slate-500">cm</span>
          </label>
          <Input id="heightCm" type="number" {...register("heightCm")} placeholder="170" />
          {errors.heightCm && <p className="text-xs text-red-500">{errors.heightCm.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="currentWeightKg" className="block text-sm font-medium">
            <span className="font-kannada text-slate-800">ತೂಕ</span>
            <span className="ml-1 text-slate-500">kg</span>
          </label>
          <Input id="currentWeightKg" type="number" {...register("currentWeightKg")} placeholder="70" />
          {errors.currentWeightKg && <p className="text-xs text-red-500">{errors.currentWeightKg.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="waistCm" className="block text-sm font-medium">
            <span className="font-kannada text-slate-800">ಸೊಂಟ</span>
            <span className="ml-1 text-slate-500">cm</span>
          </label>
          <Input id="waistCm" type="number" {...register("waistCm")} placeholder="80" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ಪರಿಸ್ಥಿತಿಗಳು</span>
          <span className="ml-2 text-slate-500">Existing Conditions</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EXISTING_CONDITIONS.map((condition) => (
            <label
              key={condition}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                conditions.includes(condition) ? "border-blue-600 bg-blue-50" : "border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={conditions.includes(condition)}
                onChange={() => toggleCondition(condition)}
                className="rounded"
              />
              <span className="text-sm">{condition}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          ← ಹಿಂದೆ / Back
        </Button>
        <Button
          type="submit"
          className="flex-1 text-white"
          style={{ backgroundColor: "#1A3C6B" }}
        >
          ಮುಂದೆ / Next
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Preferences ────────────────────────────────────────────

function Step3Form({
  form,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  form: UseFormReturn<Step3Data>;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = form;
  const dietPref = watch("dietPreference");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಆಹಾರ ಆದ್ಯತೆ</span>
          <span className="ml-2 text-slate-500">Diet Preference</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {([
            { value: "veg" as const, label: "ಸಸ್ಯಾಹಾರಿ / Veg", icon: "🥬", color: "green" },
            { value: "non_veg" as const, label: "ಮಾಂಸಾಹಾರಿ / Non-Veg", icon: "🍗", color: "red" },
          ] as const).map(({ value, label, icon, color }) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                dietPref === value
                  ? color === "green"
                    ? "border-green-600 bg-green-50 shadow-md"
                    : "border-red-600 bg-red-50 shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                value={value}
                {...register("dietPreference")}
                className="sr-only"
              />
              <span className="text-4xl">{icon}</span>
              <span className="text-center text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
        {errors.dietPreference && <p className="text-xs text-red-500">{errors.dietPreference.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          <span className="font-kannada text-slate-800">ಆದ್ಯತೆಯ ಭಾಷೆ</span>
          <span className="ml-2 text-slate-500">Preferred Language</span>
        </label>
        <div className="flex gap-3">
          {([
            { value: "kn" as const, label: "ಕನ್ನಡ" },
            { value: "en" as const, label: "English" },
          ] as const).map(({ value, label }) => (
            <label
              key={value}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={value}
                {...register("preferredLanguage")}
                className="sr-only"
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          ← ಹಿಂದೆ / Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 text-white"
          style={{ backgroundColor: "#1A3C6B" }}
        >
          {isSubmitting ? "ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ... / Submitting..." : "ಸಲ್ಲಿಸಿ / Submit"}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Multi-step Form ───────────────────────────────────────────

const STEP_TITLES = [
  { kn: "ಪೊಲೀಸ್ ಗುರುತು", en: "Police Identity" },
  { kn: "ಆರೋಗ್ಯ ವಿವರಗಳು", en: "Health Details" },
  { kn: "ಆದ್ಯತೆಗಳು", en: "Preferences" },
];

export function StaffProfileForm({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullNameEn: "",
      fullNameKn: "",
      badgeNumber: "",
      rank: undefined,
      dutyType: undefined,
      achievements: "",
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      dateOfBirth: "",
      gender: undefined,
      bloodGroup: undefined,
      heightCm: undefined,
      currentWeightKg: undefined,
      waistCm: undefined,
      existingConditions: [],
    },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      dietPreference: undefined,
      preferredLanguage: "kn",
    },
  });

  async function handleFinalSubmit() {
    if (!user) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const s1 = step1Form.getValues();
      const s2 = step2Form.getValues();
      const s3 = step3Form.getValues();

      const profileData = {
        fullNameEn: s1.fullNameEn,
        fullNameKn: s1.fullNameKn,
        displayName: s1.fullNameEn,
        badgeNumber: s1.badgeNumber,
        rank: s1.rank as Rank,
        dutyType: s1.dutyType as DutyType,
        achievements: s1.achievements
          ? s1.achievements.split("\n").filter(Boolean)
          : [],
        dateOfBirth: s2.dateOfBirth,
        gender: s2.gender,
        bloodGroup: s2.bloodGroup as BloodGroup,
        heightCm: Number(s2.heightCm),
        currentWeightKg: Number(s2.currentWeightKg),
        waistCm: s2.waistCm ? Number(s2.waistCm) : undefined,
        existingConditions: s2.existingConditions,
        dietPreference: s3.dietPreference as DietPreference,
        profileComplete: true,
      };

      // Save profile to Firestore
      await updateUserProfile(user.uid, profileData);

      // Create first health log
      await createHealthLog(
        user.uid,
        Number(s2.currentWeightKg),
        Number(s2.heightCm),
        "Initial health log from profile creation",
        s2.waistCm ? Number(s2.waistCm) : undefined
      );

      onComplete();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(
        `ಪ್ರೊಫೈಲ್ ಉಳಿಸಲು ವಿಫಲವಾಗಿದೆ / Failed to save profile: ${message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Error banner */}
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start justify-between gap-2">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEP_TITLES.map((title, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                i === step
                  ? "text-white"
                  : i < step
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
              style={i === step ? { backgroundColor: "#1A3C6B" } : undefined}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEP_TITLES.length - 1 && (
              <div className={`h-0.5 w-8 ${i < step ? "bg-green-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-kannada text-lg font-bold text-slate-800">
                {STEP_TITLES[step].kn}
              </h2>
              <p className="text-sm text-slate-500">{STEP_TITLES[step].en}</p>
            </div>
            <Badge variant="outline">
              {step + 1} / {STEP_TITLES.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {step === 0 && (
            <Step1Form form={step1Form} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <Step2Form
              form={step2Form}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <Step3Form
              form={step3Form}
              onSubmit={handleFinalSubmit}
              onBack={() => setStep(1)}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
