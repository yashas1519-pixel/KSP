"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

interface PasswordError {
  en: string;
  kn: string;
}

function validatePassword(password: string): PasswordError | null {
  if (password.length < PASSWORD_RULES.minLength) {
    return {
      en: `Password must be at least ${PASSWORD_RULES.minLength} characters`,
      kn: `ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ ${PASSWORD_RULES.minLength} ಅಕ್ಷರಗಳಾಗಿರಬೇಕು`,
    };
  }
  if (!PASSWORD_RULES.uppercase.test(password)) {
    return {
      en: "Password must contain at least 1 uppercase letter",
      kn: "ಪಾಸ್‌ವರ್ಡ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ 1 ದೊಡ್ಡ ಅಕ್ಷರ ಇರಬೇಕು",
    };
  }
  if (!PASSWORD_RULES.digit.test(password)) {
    return {
      en: "Password must contain at least 1 number",
      kn: "ಪಾಸ್‌ವರ್ಡ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ 1 ಸಂಖ್ಯೆ ಇರಬೇಕು",
    };
  }
  if (!PASSWORD_RULES.special.test(password)) {
    return {
      en: "Password must contain at least 1 special character",
      kn: "ಪಾಸ್‌ವರ್ಡ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ 1 ವಿಶೇಷ ಅಕ್ಷರ ಇರಬೇಕು",
    };
  }
  return null;
}

function getRoleDashboard(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return ROUTES.DASHBOARD_ADMIN;
    case Role.PRISON_HEAD:
      return ROUTES.DASHBOARD_HEAD;
    case Role.STAFF:
      return ROUTES.DASHBOARD_STAFF;
    default:
      return ROUTES.DASHBOARD;
  }
}

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<PasswordError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { user, firebaseUser, role, mustChangePassword, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace(ROUTES.LOGIN);
      return;
    }
    if (!mustChangePassword && user) {
      router.replace(role ? getRoleDashboard(role) : ROUTES.DASHBOARD);
    }
  }, [loading, firebaseUser, mustChangePassword, user, role, router]);

  useEffect(() => {
    if (!mustChangePassword) return;
    const handlePopState = () => {
      router.replace(ROUTES.CHANGE_PASSWORD);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mustChangePassword, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError({
        en: "Passwords do not match",
        kn: "ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError({
          en: "Session expired. Please log in again.",
          kn: "ಸೆಷನ್ ಮುಗಿದಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ.",
        });
        setIsSubmitting(false);
        return;
      }

      await updatePassword(currentUser, newPassword);

      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/auth/clear-password-flag", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update password flag");
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace(role ? getRoleDashboard(role) : ROUTES.DASHBOARD);
      }, 1500);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/requires-recent-login") {
        setError({
          en: "For security, please log out and log in again before changing your password.",
          kn: "ಭದ್ರತೆಗಾಗಿ, ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸುವ ಮೊದಲು ಲಾಗ್ ಔಟ್ ಮಾಡಿ ಮತ್ತೆ ಲಾಗಿನ್ ಮಾಡಿ.",
        });
      } else {
        setError({
          en: firebaseError.message || "Something went wrong. Please try again.",
          kn: "ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Password strength
  const checks = {
    length: newPassword.length >= 8,
    upper: PASSWORD_RULES.uppercase.test(newPassword),
    digit: PASSWORD_RULES.digit.test(newPassword),
    special: PASSWORD_RULES.special.test(newPassword),
  };
  const passed = Object.values(checks).filter(Boolean).length;

  const strengthColors = ["#A32D2D", "#BA7517", "#C9A84C", "#3B6D11"];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F5F6FA" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300" style={{ borderTopColor: "#1A3C6B" }} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen">
      {/* ── Left Panel — Navy (hidden on mobile) ── */}
      <div
        className="hidden flex-col items-center justify-center md:flex"
        style={{ backgroundColor: "#1A3C6B", width: "35%", minWidth: 320 }}
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#C9A84C" }}>
          <span className="text-2xl" style={{ color: "#1A3C6B" }}>🔒</span>
        </div>
        <p className="font-kannada text-[13px] font-medium text-white">ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ</p>
        <div className="my-3 h-px w-16" style={{ backgroundColor: "#C9A84C" }} />
        <p className="text-[11px] text-white/80">Change Password</p>
        <p className="mt-2 font-kannada text-[10px]" style={{ color: "#C9A84C" }}>
          ಸುರಕ್ಷಿತ ಖಾತೆಗಾಗಿ / For account security
        </p>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex flex-1 items-center justify-center p-6" style={{ backgroundColor: "#F5F6FA" }}>
        <div className="w-full max-w-[420px] rounded-xl bg-white p-8 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          {/* Mobile emblem */}
          <div className="mb-6 flex justify-center md:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#C9A84C" }}>
              <span className="text-xl" style={{ color: "#1A3C6B" }}>🔒</span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6 text-center">
            <h1 className="font-kannada text-[20px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ
            </h1>
            <p className="text-[12px]" style={{ color: "#6b7280" }}>Change Password</p>
          </div>

          {success ? (
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: "#EAF3DE", border: "0.5px solid #3B6D1130" }}>
              <p className="font-kannada font-medium" style={{ color: "#27500A" }}>
                ✅ ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ!
              </p>
              <p className="text-[12px]" style={{ color: "#3B6D11" }}>Password changed successfully!</p>
              <p className="mt-2 text-[11px]" style={{ color: "#6b7280" }}>Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Warning */}
              <div className="rounded-lg p-3 text-[12px]" style={{ backgroundColor: "#FAEEDA", border: "0.5px solid #BA751730" }}>
                <p className="font-kannada font-medium" style={{ color: "#633806" }}>
                  ⚠️ ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಬೇಕು.
                </p>
                <p style={{ color: "#BA7517" }}>You must change your password to continue.</p>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block">
                  <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>ಹೊಸ ಪಾಸ್‌ವರ್ಡ್</span>
                  <br />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>New Password</span>
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  minLength={8}
                  className="h-10 rounded-lg border-[0.5px] text-[13px]"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>

              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i < passed ? strengthColors[passed - 1] : "#e5e7eb",
                        }}
                      />
                    ))}
                  </div>
                  <div className="space-y-0.5 text-[10px]">
                    <p style={{ color: checks.length ? "#3B6D11" : "#6b7280" }}>{checks.length ? "✓" : "○"} Min 8 characters</p>
                    <p style={{ color: checks.upper ? "#3B6D11" : "#6b7280" }}>{checks.upper ? "✓" : "○"} 1 uppercase letter</p>
                    <p style={{ color: checks.digit ? "#3B6D11" : "#6b7280" }}>{checks.digit ? "✓" : "○"} 1 number</p>
                    <p style={{ color: checks.special ? "#3B6D11" : "#6b7280" }}>{checks.special ? "✓" : "○"} 1 special character</p>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block">
                  <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ</span>
                  <br />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>Confirm Password</span>
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  minLength={8}
                  className="h-10 rounded-lg border-[0.5px] text-[13px]"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg p-3 text-[12px]" style={{ backgroundColor: "#FCEBEB", border: "0.5px solid #A32D2D20" }} role="alert">
                  <p className="font-kannada font-medium" style={{ color: "#A32D2D" }}>{error.kn}</p>
                  <p style={{ color: "#501313" }}>{error.en}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-kannada">ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ...</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-kannada">ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ</span>
                    <span className="ml-2">Change Password</span>
                  </span>
                )}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-[10px]" style={{ color: "#6b7280" }}>
            Karnataka State Police — Staff Fitness Portal
          </p>
        </div>
      </div>
    </main>
  );
}
