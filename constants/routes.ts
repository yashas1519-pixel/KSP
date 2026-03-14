export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  PROFILE: "/dashboard/profile",
  HEALTH: "/dashboard/health",
  DIET: "/dashboard/diet",
  EXERCISE: "/dashboard/exercise",
  STAFF_LIST: "/dashboard/staff",
  SETTINGS: "/dashboard/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
