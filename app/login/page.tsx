"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

      // After sign-in, fetch user doc to determine role for redirect
      // The AuthContext will handle fetching the role, but we need to wait
      // We'll use a small delay to let the context update, then redirect
      // A better approach: listen to auth context changes
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-col items-center gap-4 pb-2 pt-8">
          {/* Shield Icon Placeholder */}
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>

          {/* App Title — Bilingual */}
          <div className="text-center">
            <h1
              className="font-kannada text-2xl font-bold"
              style={{ color: "#1A3C6B" }}
            >
              ಕೆಎಸ್‌ಪಿ ಫಿಟ್‌ನೆಸ್
            </h1>
            <p className="text-lg font-semibold text-slate-600">KSP Fitness</p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
              >
                <span className="font-kannada text-slate-800">ಇಮೇಲ್</span>
                <span className="ml-2 text-slate-500">Email</span>
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
                className="h-11"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
              >
                <span className="font-kannada text-slate-800">
                  ಪಾಸ್‌ವರ್ಡ್
                </span>
                <span className="ml-2 text-slate-500">Password</span>
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

            {/* Login Button */}
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
                  <span className="font-kannada">ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ...</span>
                </span>
              ) : (
                <span className="font-kannada">ಲಾಗಿನ್</span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Karnataka State Police — Staff Fitness Portal
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
