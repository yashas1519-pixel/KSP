"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const ERROR_MESSAGES: Record<string, { en: string; kn: string }> = {
  "auth/invalid-credential": {
    en: "Invalid email or password",
    kn: "ಅಮಾನ್ಯ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್",
  },
  "auth/user-not-found": {
    en: "No account found with this email",
    kn: "ಈ ಇಮೇಲ್‌ನೊಂದಿಗೆ ಯಾವುದೇ ಖಾತೆ ಕಂಡುಬಂದಿಲ್ಲ",
  },
  "auth/wrong-password": {
    en: "Incorrect password",
    kn: "ತಪ್ಪಾದ ಪಾಸ್‌ವರ್ಡ್",
  },
  "auth/too-many-requests": {
    en: "Too many attempts. Please try again later",
    kn: "ಹಲವು ಪ್ರಯತ್ನಗಳು. ದಯವಿಟ್ಟು ನಂತರ ಪ್ರಯತ್ನಿಸಿ",
  },
  default: {
    en: "Something went wrong. Please try again",
    kn: "ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
  },
};

function getErrorMessage(code: string): { en: string; kn: string } {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ en: string; kn: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);

      const { getDocument } = await import("@/lib/firebase/firestore");
      const { auth } = await import("@/lib/firebase/auth");
      const currentUser = auth.currentUser;

      if (currentUser) {
        const userDoc = await getDocument<{ role: Role; mustChangePassword?: boolean }>(
          "users",
          currentUser.uid
        );

        if (userDoc?.mustChangePassword) {
          router.replace(ROUTES.CHANGE_PASSWORD);
        } else if (userDoc?.role) {
          router.replace(getRoleDashboard(userDoc.role));
        } else {
          router.replace(ROUTES.DASHBOARD);
        }
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      const errorCode = firebaseError.code ?? "default";
      setError(getErrorMessage(errorCode));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* ── Left Panel — Navy (hidden on mobile) ── */}
      <div
        className="hidden flex-col items-center justify-center md:flex"
        style={{
          backgroundColor: "#1A3C6B",
          width: "35%",
          minWidth: 320,
        }}
      >
        {/* Gold star emblem */}
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "#C9A84C" }}
        >
          <span className="text-2xl" style={{ color: "#1A3C6B" }}>★</span>
        </div>

        <p className="font-kannada text-[13px] font-medium text-white">
          ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್
        </p>

        {/* Gold divider */}
        <div
          className="my-3 h-px w-16"
          style={{ backgroundColor: "#C9A84C" }}
        />

        <p className="text-[11px] text-white/80">
          Karnataka State Police
        </p>

        <p
          className="mt-2 font-kannada text-[10px]"
          style={{ color: "#C9A84C" }}
        >
          ಸೇವೆ ಮತ್ತು ಸುರಕ್ಷತೆ / Service and Security
        </p>
      </div>

      {/* ── Right Panel — Form ── */}
      <div
        className="flex flex-1 items-center justify-center p-6"
        style={{ backgroundColor: "#F5F6FA" }}
      >
        <div className="w-full max-w-[400px] rounded-xl bg-white p-8 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          {/* Mobile-only emblem */}
          <div className="mb-6 flex justify-center md:hidden">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "#C9A84C" }}
            >
              <span className="text-xl" style={{ color: "#1A3C6B" }}>★</span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6 text-center">
            <h1
              className="font-kannada text-[20px]"
              style={{ color: "#1A3C6B", fontWeight: 500 }}
            >
              ಕೆಎಸ್ಪಿ ಫಿಟ್ನೆಸ್
            </h1>
            <p className="text-[12px]" style={{ color: "#6b7280" }}>
              KSP Fitness — Sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block">
                <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>
                  ಇಮೇಲ್
                </span>
                <br />
                <span className="text-[10px]" style={{ color: "#6b7280" }}>Email</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@ksp.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="email"
                className="h-10 rounded-lg border-[0.5px] text-[13px] focus:border-navy focus:ring-navy"
                style={{ borderColor: "#e5e7eb" }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block">
                <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>
                  ಪಾಸ್‌ವರ್ಡ್
                </span>
                <br />
                <span className="text-[10px]" style={{ color: "#6b7280" }}>Password</span>
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="current-password"
                minLength={6}
                className="h-10 rounded-lg border-[0.5px] text-[13px] focus:border-navy focus:ring-navy"
                style={{ borderColor: "#e5e7eb" }}
              />
            </div>

            {/* Forgot Password */}
            <div className="text-center">
              <a
                href={ROUTES.FORGOT_PASSWORD}
                className="font-kannada text-[12px] font-medium hover:underline"
                style={{ color: "#C9A84C" }}
              >
                ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?
                <span className="ml-1 font-sans">Forgot password?</span>
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="rounded-lg p-3 text-[12px]"
                style={{
                  backgroundColor: "#FCEBEB",
                  border: "0.5px solid #A32D2D20",
                }}
                role="alert"
              >
                <p className="font-kannada font-medium" style={{ color: "#A32D2D" }}>
                  {error.kn}
                </p>
                <p style={{ color: "#501313" }}>{error.en}</p>
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90"
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
                  <span className="font-kannada">ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ...</span>
                </span>
              ) : (
                <span className="font-kannada">ಲಾಗಿನ್</span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px]" style={{ color: "#6b7280" }}>
            Karnataka State Police — Staff Fitness Portal
          </p>
        </div>
      </div>
    </main>
  );
}
