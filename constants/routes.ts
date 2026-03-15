export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CHANGE_PASSWORD: "/change-password",
  FORGOT_PASSWORD: "/forgot-password",
  UNAUTHORIZED: "/unauthorized",
  DASHBOARD: "/dashboard",
  DASHBOARD_ADMIN: "/dashboard/admin",
  DASHBOARD_HEAD: "/dashboard/head",
  DASHBOARD_STAFF: "/dashboard/staff",
  PROFILE: "/dashboard/profile",
  HEALTH: "/dashboard/health",
  DIET: "/dashboard/diet",
  EXERCISE: "/dashboard/exercise",
  STAFF_LIST: "/dashboard/staff-list",
  SETTINGS: "/dashboard/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
