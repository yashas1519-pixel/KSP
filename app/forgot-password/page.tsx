"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ────────────────── Types ────────────────── */

type Step = 1 | 2 | 3;

/* ────────────────── Helpers ────────────────── */

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const first = user[0];
  const last = user[user.length - 1];
  return `${first}${"*".repeat(Math.max(user.length - 2, 2))}${last}@${domain}`;
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

      setStep(2);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      setTimeLeft(600);
      setResendCooldown(60);
      setAttemptsLeft(3);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError(null);

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
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpDigits(newOtp);
      const lastIndex = Math.min(digits.length - 1, 5);
      otpRefs.current[lastIndex]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value;
    setOtpDigits(newOtp);

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

  /* ── Computed ── */
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const timerColor = timeLeft < 120 ? "#A32D2D" : "#1A3C6B";

  const passedChecks = PASSWORD_CHECKS.filter((c) => c.test(newPassword)).length;
  const strengthColors = ["#A32D2D", "#BA7517", "#C9A84C", "#3B6D11"];

  return (
    <main className="flex min-h-screen">
      {/* ── Left Panel (hidden on mobile) ── */}
      <div
        className="hidden flex-col items-center justify-center md:flex"
        style={{ backgroundColor: "#1A3C6B", width: "35%", minWidth: 320 }}
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#C9A84C" }}>
          <span className="text-2xl" style={{ color: "#1A3C6B" }}>🔑</span>
        </div>
        <p className="font-kannada text-[13px] font-medium text-white">ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ</p>
        <div className="my-3 h-px w-16" style={{ backgroundColor: "#C9A84C" }} />
        <p className="text-[11px] text-white/80">Reset Password</p>
        <p className="mt-2 font-kannada text-[10px]" style={{ color: "#C9A84C" }}>
          ಸುರಕ್ಷಿತ OTP ಆಧಾರಿತ / Secure OTP Based
        </p>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex flex-1 items-center justify-center p-6" style={{ backgroundColor: "#F5F6FA" }}>
        <div className="w-full max-w-[420px] rounded-xl bg-white p-8 shadow-sm" style={{ border: "0.5px solid #e5e7eb" }}>
          {/* Mobile emblem */}
          <div className="mb-6 flex justify-center md:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#C9A84C" }}>
              <span className="text-xl" style={{ color: "#1A3C6B" }}>🔑</span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4 text-center">
            <h1 className="font-kannada text-[20px]" style={{ color: "#1A3C6B", fontWeight: 500 }}>
              ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?
            </h1>
            <p className="text-[12px]" style={{ color: "#6b7280" }}>Forgot Password</p>
          </div>

          {/* Step Indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium transition-colors"
                  style={{
                    backgroundColor: step > s ? "#C9A84C" : step === s ? "#1A3C6B" : "#e5e7eb",
                    color: step >= s ? "#ffffff" : "#6b7280",
                  }}
                >
                  {step > s ? "✓" : s}
                </div>
                {s < 3 && (
                  <div
                    className="h-0.5 w-6 transition-colors"
                    style={{ backgroundColor: step > s ? "#C9A84C" : "#e5e7eb" }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ═══════════════ STEP 1: Email ═══════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block">
                  <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>ಇಮೇಲ್</span>
                  <br />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>Email</span>
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
                  className="h-10 rounded-lg border-[0.5px] text-[13px]"
                  style={{ borderColor: "#e5e7eb" }}
                />
                <p className="text-[10px]" style={{ color: "#6b7280" }}>
                  Enter your registered email / ನಿಮ್ಮ ನೋಂದಾಯಿತ ಇಮೇಲ್ ನಮೂದಿಸಿ
                </p>
              </div>

              {emailError && (
                <div className="rounded-lg p-3 text-[12px]" style={{ backgroundColor: "#FCEBEB", border: "0.5px solid #A32D2D20" }} role="alert">
                  <p style={{ color: "#A32D2D" }}>{emailError}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleSendOTP}
                disabled={emailLoading}
                className="h-10 w-full rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90"
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

              <p className="text-center text-[12px]">
                <a href={ROUTES.LOGIN} className="font-medium hover:underline" style={{ color: "#1A3C6B" }}>
                  ← ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ / Back to Login
                </a>
              </p>
            </div>
          )}

          {/* ═══════════════ STEP 2: OTP ═══════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-center text-[12px]" style={{ color: "#6b7280" }}>
                OTP sent to <strong style={{ color: "#1a1a2e" }}>{maskEmail(email)}</strong>
              </p>

              {/* Timer */}
              <p className="text-center font-mono text-[14px] font-medium" style={{ color: timerColor }}>
                ⏰ {timerStr}
              </p>

              {/* OTP Boxes */}
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
                    className="h-12 w-10 rounded-lg bg-white text-center text-lg font-medium outline-none transition-all disabled:opacity-50"
                    style={{
                      border: digit ? "2px solid #C9A84C" : "1.5px solid #e5e7eb",
                      color: "#1a1a2e",
                    }}
                    onFocus={(e) => {
                      if (!digit) e.currentTarget.style.border = "2px solid #1A3C6B";
                    }}
                    onBlur={(e) => {
                      if (!digit) e.currentTarget.style.border = "1.5px solid #e5e7eb";
                    }}
                    aria-label={`OTP digit ${i + 1}`}
                  />
                ))}
              </div>

              {/* Attempts */}
              <p className="text-center text-[10px]" style={{ color: "#6b7280" }}>
                {attemptsLeft} attempt(s) remaining / {attemptsLeft} ಪ್ರಯತ್ನ(ಗಳು) ಉಳಿದಿವೆ
              </p>

              {otpError && (
                <div className="rounded-lg p-3 text-[12px]" style={{ backgroundColor: "#FCEBEB", border: "0.5px solid #A32D2D20" }} role="alert">
                  <p style={{ color: "#A32D2D" }}>{otpError}</p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleVerifyOTP}
                disabled={otpLoading || otpDigits.join("").length !== 6 || timeLeft <= 0}
                className="h-10 w-full rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90"
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
              <p className="text-center text-[12px]">
                {resendCooldown > 0 ? (
                  <span style={{ color: "#6b7280" }}>Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={emailLoading}
                    className="font-medium underline"
                    style={{ color: "#C9A84C" }}
                  >
                    OTP ಮರುಕಳುಹಿಸಿ / Resend OTP
                  </button>
                )}
              </p>
            </div>
          )}

          {/* ═══════════════ STEP 3: New Password ═══════════════ */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="new-pass" className="block">
                  <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>ಹೊಸ ಪಾಸ್‌ವರ್ಡ್</span>
                  <br />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>New Password</span>
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
                    className="h-10 rounded-lg border-[0.5px] pr-12 text-[13px]"
                    style={{ borderColor: "#e5e7eb" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] hover:underline"
                    style={{ color: "#6b7280" }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Strength - 4 segments */}
                {newPassword && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: i < passedChecks ? strengthColors[passedChecks - 1] : "#e5e7eb",
                          }}
                        />
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      {PASSWORD_CHECKS.map((check, i) => {
                        const ok = check.test(newPassword);
                        return (
                          <p key={i} className="text-[10px]" style={{ color: ok ? "#3B6D11" : "#6b7280" }}>
                            {ok ? "✓" : "○"} {check.kn} / {check.en}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-pass" className="block">
                  <span className="font-kannada text-[12px] font-medium" style={{ color: "#1a1a2e" }}>ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ</span>
                  <br />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>Confirm Password</span>
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
                  className="h-10 rounded-lg border-[0.5px] text-[13px]"
                  style={{ borderColor: "#e5e7eb" }}
                />
              </div>

              {passwordError && (
                <div className="rounded-lg p-3 text-[12px]" style={{ backgroundColor: "#FCEBEB", border: "0.5px solid #A32D2D20" }} role="alert">
                  <p style={{ color: "#A32D2D" }}>{passwordError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={passwordLoading}
                className="h-10 w-full rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90"
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

          <p className="mt-6 text-center text-[10px]" style={{ color: "#6b7280" }}>
            Karnataka State Police — Staff Fitness Portal
          </p>
        </div>
      </div>
    </main>
  );
}
