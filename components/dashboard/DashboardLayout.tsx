"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { Navbar } from "@/components/dashboard/Navbar";

// ─── Nav items per role ─────────────────────────────────────────────

interface NavItem {
  href: string;
  icon: string;
  labelKn: string;
  labelEn: string;
}

const STAFF_NAV: NavItem[] = [
  { href: "/dashboard/staff", icon: "🏠", labelKn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", labelEn: "Dashboard" },
  { href: "/dashboard/staff/profile", icon: "👤", labelKn: "ಪ್ರೊಫೈಲ್", labelEn: "Profile" },
  { href: "/dashboard/staff/progress", icon: "📈", labelKn: "ಪ್ರಗತಿ", labelEn: "Progress" },
  { href: "/dashboard/staff/diet", icon: "🍽️", labelKn: "ಆಹಾರ", labelEn: "Diet" },
  { href: "/dashboard/staff/exercise", icon: "🏋️", labelKn: "ವ್ಯಾಯಾಮ", labelEn: "Exercise" },
];

const HEAD_NAV: NavItem[] = [
  { href: "/dashboard/head", icon: "🏠", labelKn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", labelEn: "Dashboard" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", icon: "🏠", labelKn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", labelEn: "Dashboard" },
];

function getNavItems(role?: Role): NavItem[] {
  switch (role) {
    case Role.STAFF:
      return STAFF_NAV;
    case Role.PRISON_HEAD:
      return HEAD_NAV;
    case Role.SUPER_ADMIN:
      return ADMIN_NAV;
    default:
      return [];
  }
}

// ═════════════════════════════════════════════════════════════════════

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  const navItems = getNavItems(user?.role as Role | undefined);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F6FA" }}>
      <Navbar />

      <div className="flex">
        {/* ── Desktop/Tablet Sidebar ── */}
        <aside
          className="desktop-sidebar sticky top-0 h-[calc(100vh-56px)] flex-col transition-all duration-200"
          style={{
            backgroundColor: "#1A3C6B",
            width: hovered ? 180 : 180,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Section label */}
          <div className="px-4 pb-2 pt-5">
            <p
              className="text-[9px] font-medium uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              ನ್ಯಾವಿಗೇಷನ್
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-150"
                  style={{
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                    borderLeft: isActive
                      ? "3px solid #C9A84C"
                      : "3px solid transparent",
                  }}
                  title={item.labelEn}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <span className="font-kannada text-[12px] font-medium">{item.labelKn}</span>
                    <span className="ml-1 text-[10px] opacity-60">{item.labelEn}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav
        className="bottom-tab-bar fixed inset-x-0 bottom-0 z-40 items-center justify-around border-t px-1 py-1.5"
        style={{
          backgroundColor: "#1A3C6B",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-colors"
              style={{
                color: isActive ? "#C9A84C" : "rgba(255,255,255,0.5)",
              }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-kannada text-[9px] font-medium">{item.labelKn}</span>
              {isActive && (
                <div
                  className="h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: "#C9A84C" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
