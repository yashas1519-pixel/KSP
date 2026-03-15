"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ────────────────── Types ────────────────── */

type Step = 1 | 2 | 3;

interface PasswordStrength {
  level: "weak" | "medium" | "strong";
  label: string;
  color: string;
  width: string;
}

/* ────────────────── Helpers ────────────────── */

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const first = user[0];
  const last = user[user.length - 1];
  return `${first}${"*".repeat(Math.max(user.length - 2, 2))}${last}@${domain}`;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;

  if (score <= 2) return { level: "weak", label: "Weak", color: "#ef4444", width: "33%" };
  if (score <= 3) return { level: "medium", label: "Medium", color: "#f59e0b", width: "66%" };
  return { level: "strong", label: "Strong", color: "#22c55e", width: "100%" };
}

const PASSWORD_CHECKS = [
  { test: (p: string) => p.length >= 8, en: "At least 8 characters", kn: "ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳು" },
  { test: (p: string) => /[A-Z]/.test(p), en: "One uppercase letter", kn: "ಒಂದು ದೊಡ್ಡ ಅಕ್ಷರ" },
  { test: (p: string) => /[0-9]/.test(p), en: "One number", kn: "ಒಂದು ಸಂಖ್ಯೆ" },
  { test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), en: "One special character", kn: "ಒಂದು ವಿಶೇಷ ಅಕ್ಷರ" },
];

/* ────────────────── Component ────────────────── */

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Email
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Step 2: OTP
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Password
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  /* ── OTP Expiry Timer ── */
  useEffect(() => {
    if (step !== 2 || otpExpiresAt === 0) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpExpiresAt]);

  /* ── Resend Cooldown Timer ── */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  /* ── Step 1: Send OTP ── */
  const handleSendOTP = useCallback(async () => {
    setEmailError(null);
    if (!email.trim()) {
      setEmailError("Please enter your email address. | ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಮೇಲ್ ನಮೂದಿಸಿ.");
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok && data.error) {
        setEmailError(data.error);
        return;
      }

      // Move to OTP step
      setStep(2);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setTimeLeft(600);
      setResendCooldown(60);
      setAttemptsLeft(3);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError(null);

      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setEmailError("Network error. Please try again. | ನೆಟ್‌ವರ್ಕ್ ದೋಷ.");
    } finally {
      setEmailLoading(false);
    }
  }, [email]);

  /* ── Step 2: OTP Input Handlers ── */
  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Paste support: if pasting 6 digits, fill all boxes
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpDigits(newOtp);
      // Focus the last filled input or the submit button
      const lastIndex = Math.min(digits.length - 1, 5);
      otpRefs.current[lastIndex]?.focus();
      return;
    }

    // Single digit
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value;
    setOtpDigits(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  /* ── Step 2: Verify OTP ── */
  async function handleVerifyOTP() {
    setOtpError(null);
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setOtpError("Please enter all 6 digits. | ದಯವಿಟ್ಟು ಎಲ್ಲಾ 6 ಅಂಕಿಗಳನ್ನು ನಮೂದಿಸಿ.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });

      const data = await res.json();

      if (data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setStep(3);
        return;
      }

      setOtpError(data.error || "Invalid OTP.");
      if (typeof data.attemptsLeft === "number") {
        setAttemptsLeft(data.attemptsLeft);
      }
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch {
      setOtpError("Network error. Please try again. | ನೆಟ್‌ವರ್ಕ್ ದೋಷ.");
    } finally {
      setOtpLoading(false);
    }
  }

  /* ── Step 2: Resend OTP ── */
  async function handleResendOTP() {
    if (resendCooldown > 0) return;
    setOtpError(null);
    setEmailLoading(true);
    try {
      await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setTimeLeft(600);
      setResendCooldown(60);
      setAttemptsLeft(3);
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch {
      setOtpError("Failed to resend OTP.");
    } finally {
      setEmailLoading(false);
    }
  }

  /* ── Step 3: Reset Password ── */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    // Validate all checks pass
    const allPassed = PASSWORD_CHECKS.every((c) => c.test(newPassword));
    if (!allPassed) {
      setPasswordError("Password does not meet all requirements. | ಪಾಸ್‌ವರ್ಡ್ ಅವಶ್ಯಕತೆಗಳನ್ನು ಪೂರೈಸುತ್ತಿಲ್ಲ.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. | ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        router.replace(`${ROUTES.LOGIN}?reset=success`);
        return;
      }

      setPasswordError(data.error || "Password reset failed.");
    } catch {
      setPasswordError("Network error. Please try again. | ನೆಟ್‌ವರ್ಕ್ ದೋಷ.");
    } finally {
      setPasswordLoading(false);
    }
  }

  /* ── Timer Format ── */
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const timerColor = timeLeft < 120 ? "#ef4444" : "#64748b";
  const strength = getPasswordStrength(newPassword);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-col items-center gap-4 pb-2 pt-8">
          {/* Icon */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#1A3C6B" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
              <circle cx="12" cy="16" r="1" />
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="font-kannada text-xl font-bold" style={{ color: "#1A3C6B" }}>
              ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?
            </h1>
            <p className="text-lg font-semibold text-slate-600">Forgot Password</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors"
                  style={{
                    backgroundColor: step >= s ? "#1A3C6B" : "#e2e8f0",
                    color: step >= s ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className="h-0.5 w-8 transition-colors"
                    style={{ backgroundColor: step > s ? "#1A3C6B" : "#e2e8f0" }}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          {/* ═══════════════ STEP 1: Email ═══════════════ */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block text-sm font-medium">
                  <span className="font-kannada text-slate-800">ಇಮೇಲ್</span>
                  <span className="ml-2 text-slate-500">Email</span>
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@ksp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  required
                  disabled={emailLoading}
                  autoComplete="email"
                  className="h-11"
                />
                <p className="text-xs text-slate-400">
                  Enter your registered email address / ನಿಮ್ಮ ನೋಂದಾಯಿತ ಇಮೇಲ್ ನಮೂದಿಸಿ
                </p>
              </div>

              {emailError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm" role="alert">
                  <p className="text-red-600">{emailError}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSendOTP}
                disabled={emailLoading}
                className="h-11 w-full text-base font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                {emailLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sending...</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-kannada">OTP ಕಳುಹಿಸಿ</span>
                    <span className="ml-2">Send OTP</span>
                  </span>
                )}
              </Button>

              <p className="text-center text-sm">
                <a href={ROUTES.LOGIN} className="font-medium" style={{ color: "#1A3C6B" }}>
                  ← Back to Login / ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ
                </a>
              </p>
            </div>
          )}

          {/* ═══════════════ STEP 2: OTP ═══════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-center text-sm text-slate-500">
                OTP sent to <strong>{maskEmail(email)}</strong>
              </p>

              {/* Timer */}
              <p className="text-center text-sm font-mono font-bold" style={{ color: timerColor }}>
                ⏰ OTP expires in {timerStr}
              </p>

              {/* OTP Input Boxes */}
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      handleOtpChange(0, pasted);
                    }}
                    disabled={otpLoading || timeLeft <= 0}
                    className="h-14 w-12 rounded-lg border-2 border-slate-200 bg-white text-center text-xl font-bold text-slate-800 outline-none transition-colors focus:border-[#1A3C6B] disabled:opacity-50"
                    aria-label={`OTP digit ${i + 1}`}
                  />
                ))}
              </div>

              {/* Attempts remaining */}
              <p className="text-center text-xs text-slate-400">
                {attemptsLeft} attempt(s) remaining / {attemptsLeft} ಪ್ರಯತ್ನ(ಗಳು) ಉಳಿದಿವೆ
              </p>

              {otpError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm" role="alert">
                  <p className="text-red-600">{otpError}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleVerifyOTP}
                disabled={otpLoading || otpDigits.join("").length !== 6 || timeLeft <= 0}
                className="h-11 w-full text-base font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                {otpLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying...</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-kannada">OTP ಪರಿಶೀಲಿಸಿ</span>
                    <span className="ml-2">Verify OTP</span>
                  </span>
                )}
              </Button>

              {/* Resend */}
              <p className="text-center text-sm">
                {resendCooldown > 0 ? (
                  <span className="text-slate-400">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={emailLoading}
                    className="font-medium underline"
                    style={{ color: "#1A3C6B" }}
                  >
                    Resend OTP / OTP ಮರುಕಳುಹಿಸಿ
                  </button>
                )}
              </p>
            </div>
          )}

          {/* ═══════════════ STEP 3: New Password ═══════════════ */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="new-pass" className="block text-sm font-medium">
                  <span className="font-kannada text-slate-800">ಹೊಸ ಪಾಸ್‌ವರ್ಡ್</span>
                  <span className="ml-2 text-slate-500">New Password</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={passwordLoading}
                    autoComplete="new-password"
                    className="h-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Strength Indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: strength.width, backgroundColor: strength.color }}
                      />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: strength.color }}>
                      {strength.label}
                    </p>
                  </div>
                )}

                {/* Requirements Checklist */}
                <div className="space-y-1 pt-1">
                  {PASSWORD_CHECKS.map((check, i) => {
                    const passed = check.test(newPassword);
                    return (
                      <p key={i} className="text-xs" style={{ color: passed ? "#22c55e" : "#94a3b8" }}>
                        {passed ? "✓" : "○"} {check.en}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-pass" className="block text-sm font-medium">
                  <span className="font-kannada text-slate-800">ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ</span>
                  <span className="ml-2 text-slate-500">Confirm Password</span>
                </label>
                <Input
                  id="confirm-pass"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={passwordLoading}
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>

              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm" role="alert">
                  <p className="text-red-600">{passwordError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={passwordLoading}
                className="h-11 w-full text-base font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#1A3C6B" }}
              >
                {passwordLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Resetting...</span>
                  </span>
                ) : (
                  <span>
                    <span className="font-kannada">ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ ಮಾಡಿ</span>
                    <span className="ml-2">Reset Password</span>
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
