/**
 * StaffProfileCard component stub.
 * Will display staff member profile with health metrics.
 */

import type { StaffProfile } from "@/types/user";

interface StaffProfileCardProps {
  profile: StaffProfile;
}

export function StaffProfileCard({ profile }: StaffProfileCardProps) {
  return <div data-uid={profile.uid} />;
}
