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
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

  // Guard: if not logged in, redirect to login
  // Guard: if no mustChangePassword flag, redirect to dashboard
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

  // Prevent back navigation — push back to this page
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

    // Validate password
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Confirm match
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

      // Step 1: Update password in Firebase Auth
      await updatePassword(currentUser, newPassword);

      // Step 2: Clear the mustChangePassword flag via server API
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

      // Redirect to dashboard after a brief success message
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[#1A3C6B]" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-col items-center gap-4 pb-2 pt-8">
          {/* Lock Icon */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#1A3C6B" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          {/* Title — Bilingual */}
          <div className="text-center">
            <h1
              className="font-kannada text-xl font-bold"
              style={{ color: "#1A3C6B" }}
            >
              ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ
            </h1>
            <p className="text-lg font-semibold text-slate-600">
              Change Password
            </p>
            <p className="mt-2 text-sm text-slate-500">
              ನಿಮ್ಮ ಮೊದಲ ಲಾಗಿನ್‌ಗಾಗಿ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ
            </p>
            <p className="text-sm text-slate-400">
              Set a new password for your first login
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          {success ? (
            <div
              className="rounded-lg border border-green-200 bg-green-50 p-4 text-center"
              role="status"
            >
              <p className="font-kannada font-semibold text-green-700">
                ✅ ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ!
              </p>
              <p className="text-green-600">Password changed successfully!</p>
              <p className="mt-2 text-sm text-green-500">
                Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Warning Banner */}
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
                role="alert"
              >
                <p className="font-kannada font-medium text-amber-800">
                  ⚠️ ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಬೇಕು.
                </p>
                <p className="text-amber-700">
                  You must change your password to continue.
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium"
                >
                  <span className="font-kannada text-slate-800">
                    ಹೊಸ ಪಾಸ್‌ವರ್ಡ್
                  </span>
                  <span className="ml-2 text-slate-500">New Password</span>
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
                  className="h-11"
                />
                <p className="text-xs text-slate-400">
                  Min 8 chars, 1 uppercase, 1 number, 1 special character
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium"
                >
                  <span className="font-kannada text-slate-800">
                    ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ
                  </span>
                  <span className="ml-2 text-slate-500">Confirm Password</span>
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
                  className="h-11"
                />
              </div>

              {/* Error Message — Bilingual */}
              {error && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
                  role="alert"
                >
                  <p className="font-kannada font-medium text-red-700">
                    {error.kn}
                  </p>
                  <p className="text-red-600">{error.en}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full text-base font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="font-kannada">
                      ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ...
                    </span>
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

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Karnataka State Police — Staff Fitness Portal
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
