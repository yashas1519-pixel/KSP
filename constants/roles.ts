export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  PRISON_HEAD = "PRISON_HEAD",
  STAFF = "STAFF",
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.PRISON_HEAD]: "Prison Head",
  [Role.STAFF]: "Staff",
};
