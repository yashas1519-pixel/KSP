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

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left — App title */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: "#1A3C6B" }}
          >
            <span className="text-sm font-bold">KSP</span>
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: "#1A3C6B" }}>
              <span className="font-kannada">ಕೆಎಸ್‌ಪಿ ಫಿಟ್‌ನೆಸ್</span>
            </h1>
            <p className="text-[10px] text-slate-400">KSP Fitness</p>
          </div>
        </div>

        {/* Right — Role badge + notifications + sign out */}
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
            <span className="font-kannada">{roleLabel.kn}</span>
            <span className="mx-1">·</span>
            <span>{roleLabel.en}</span>
          </span>

          <NotificationBell />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="h-9 text-xs text-slate-500 hover:text-red-600"
          >
            <span className="font-kannada">ಲಾಗ್‌ಔಟ್</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
