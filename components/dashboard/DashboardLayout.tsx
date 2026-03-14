import { type ReactNode } from "react";

/**
 * DashboardLayout stub.
 * Will contain sidebar, navbar, and main content area.
 */
interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return <div>{children}</div>;
}
