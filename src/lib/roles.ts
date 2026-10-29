import type { Role } from "./types";

export const AVAILABLE_ROLES: Role[] = ["citizen", "volunteer", "manager"];

// Retired or invalid roles fall back to the emergency-reporting experience.
export function normalizeRole(role: unknown): Role {
  return AVAILABLE_ROLES.find((available) => available === role) ?? "citizen";
}

export const canPlanSearch = (role: Role) => role === "volunteer";
export const canManageResources = (role: Role) => role === "manager";