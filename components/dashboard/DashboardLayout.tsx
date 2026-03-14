"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/constants/roles";
import { Navbar } from "@/components/dashboard/Navbar";
import { Button } from "@/components/ui/button";

// ─── Nav items per role ─────────────────────────────────────────────

interface NavItem {
  href: string;
  icon: string;
  labelKn: string;
  labelEn: string;
}

const STAFF_NAV: NavItem[] = [
  { href: "/dashboard/staff", icon: "🏠", labelKn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", labelEn: "Dashboard" },
  { href: "/dashboard/staff/profile", icon: "👤", labelKn: "ನನ್ನ ಪ್ರೊಫೈಲ್", labelEn: "My Profile" },
  { href: "/dashboard/staff/progress", icon: "📈", labelKn: "ನನ್ನ ಪ್ರಗತಿ", labelEn: "My Progress" },
  { href: "/dashboard/staff/diet", icon: "🍽️", labelKn: "ಆಹಾರ ಯೋಜನೆ", labelEn: "Diet Plan" },
  { href: "/dashboard/staff/exercise", icon: "🏋️", labelKn: "ವ್ಯಾಯಾಮ ಯೋಜನೆ", labelEn: "Exercise Plan" },
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
  const [collapsed, setCollapsed] = useState(false);

  const navItems = getNavItems(user?.role as Role | undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`sticky top-0 h-[calc(100vh-56px)] border-r border-slate-200 bg-white transition-all ${
            collapsed ? "w-16" : "w-56"
          }`}
        >
          {/* Collapse toggle */}
          <div className="flex justify-end p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "▶" : "◀"}
            </Button>
          </div>

          {/* Logo (visible when expanded) */}
          {!collapsed && (
            <div className="px-4 pb-4">
              <p className="font-kannada text-base font-bold" style={{ color: "#1A3C6B" }}>
                ಕೆಎಸ್‌ಪಿ ಫಿಟ್‌ನೆಸ್
              </p>
              <p className="text-[10px] text-slate-400">KSP Fitness</p>
            </div>
          )}

          {/* Nav links */}
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  style={isActive ? { backgroundColor: "#1A3C6B" } : undefined}
                  title={item.labelEn}
                >
                  <span className="text-base">{item.icon}</span>
                  {!collapsed && (
                    <div>
                      <span className="font-kannada text-sm">{item.labelKn}</span>
                      <span className="ml-1 text-[10px] opacity-70">{item.labelEn}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
