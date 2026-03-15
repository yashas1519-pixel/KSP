"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<Role, { en: string; kn: string }> = {
  [Role.SUPER_ADMIN]: { en: "Super Admin", kn: "ಸೂಪರ್ ಅಡ್ಮಿನ್" },
  [Role.PRISON_HEAD]: { en: "Prison Head", kn: "ಕಾರಾಗೃಹ ಮುಖ್ಯಸ್ಥ" },
  [Role.STAFF]: { en: "Staff", kn: "ಸಿಬ್ಬಂದಿ" },
};

export function Navbar() {
  const { user, role, signOut } = useAuth();

  if (!user || !role) return null;

  const roleLabel = ROLE_LABELS[role];
  const initials = (user.displayName || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav
      className="sticky top-0 z-30"
      style={{ backgroundColor: "#1A3C6B" }}
    >
      <div className="mx-auto flex h-14 items-center justify-between px-4">
        {/* Left — Emblem + App title */}
        <div className="flex items-center gap-3">
          {/* Gold star emblem */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: "#C9A84C" }}
          >
            <span className="text-sm" style={{ color: "#1A3C6B" }}>★</span>
          </div>
          <div>
            <p className="text-[13px] font-medium text-white">
              KSP Fitness
            </p>
            <p
              className="font-kannada text-[10px]"
              style={{ color: "#C9A84C" }}
            >
              ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್
            </p>
          </div>
        </div>

        {/* Right — Role badge + notifications + avatar + sign out */}
        <div className="flex items-center gap-3">
          {/* Role badge — hidden on mobile */}
          <span
            className="hidden rounded-full border px-3 py-1 text-[11px] font-medium sm:inline-flex"
            style={{
              borderColor: "#C9A84C",
              color: "#C9A84C",
            }}
          >
            {roleLabel.kn}
          </span>

          <NotificationBell />

          {/* Avatar circle */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              backgroundColor: "#C9A84C",
              color: "#1A3C6B",
            }}
          >
            {initials}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="h-8 text-[11px] text-white/60 hover:text-white hover:bg-white/10"
          >
            <span className="font-kannada">ಲಾಗ್‌ಔಟ್</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
