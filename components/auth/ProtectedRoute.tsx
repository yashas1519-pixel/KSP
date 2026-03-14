"use client";

import { type ReactNode } from "react";

/**
 * ProtectedRoute wrapper stub.
 * Will wrap pages requiring authentication and role-based access.
 */
interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // TODO: Implement auth check + role verification
  return <>{children}</>;
}
