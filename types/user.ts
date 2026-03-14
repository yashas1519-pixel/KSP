import { Role } from "@/constants/roles";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffProfile extends User {
  role: Role.STAFF;
  employeeId: string;
  designation: string;
  prisonId: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  bloodGroup?: string;
  address?: string;
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
