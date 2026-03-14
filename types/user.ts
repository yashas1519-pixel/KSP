import { Role } from "@/constants/roles";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  phoneNumber?: string;
  prisonId?: string;
  prisonName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DutyType = "field" | "administrative";
export type DietPreference = "veg" | "non_veg";
export type Gender = "male" | "female" | "other";

export const RANKS = [
  "Constable",
  "Head Constable",
  "ASI",
  "SI",
  "PSI",
  "PI",
  "Inspector",
  "DSP",
  "SP",
  "DIG",
] as const;

export type Rank = (typeof RANKS)[number];

export const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const EXISTING_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart condition",
  "None",
] as const;

export interface StaffProfile extends User {
  role: Role.STAFF;
  prisonId: string;
  prisonName: string;
  badgeNumber: string;
  rank: Rank;
  dutyType: DutyType;
  fullNameEn: string;
  fullNameKn: string;
  dateOfBirth: string; // ISO date string
  gender: Gender;
  bloodGroup: BloodGroup;
  heightCm: number;
  currentWeightKg: number;
  waistCm?: number;
  dietPreference: DietPreference;
  existingConditions: string[];
  achievements: string[];
  profileComplete: boolean;
}

export interface PrisonHead extends User {
  role: Role.PRISON_HEAD;
  employeeId: string;
  prisonId: string;
  prisonName: string;
  designation: string;
}

export interface SuperAdmin extends User {
  role: Role.SUPER_ADMIN;
  department: string;
}
