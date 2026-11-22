import { getDb } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";

export type StaffRole = "owner" | "admin" | "moderator" | "support";

export const PERMISSIONS = [
  "users.view",
  "users.ban",
  "users.unban",
  "users.edit",
  "users.delete",
  "listings.view",
  "listings.moderate",
  "listings.delete",
  "subscriptions.view",
  "subscriptions.manage",
  "subscriptions.grant",
  "crm.view",
  "crm.manage",
  "ai.view",
  "ai.manage",
  "analytics.view",
  "finance.view",
  "settings.view",
  "settings.manage",
  "logs.view",
  "legal.view",
  "legal.manage",
  "admins.manage",
  "support.view",
  "support.manage",
  "monitoring.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_DEFAULTS: Record<StaffRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: [
    "users.view",
    "users.ban",
    "users.unban",
    "users.edit",
    "listings.view",
    "listings.moderate",
    "listings.delete",
    "subscriptions.view",
    "subscriptions.manage",
    "subscriptions.grant",
    "crm.view",
    "crm.manage",
    "ai.view",
    "analytics.view",
    "finance.view",
    "settings.view",
    "logs.view",
    "legal.view",
    "support.view",
    "support.manage",
    "monitoring.view",
  ],
  moderator: [
    "users.view",
    "listings.view",
    "listings.moderate",
    "support.view",
    "logs.view",
    "analytics.view",
  ],
  support: ["users.view", "crm.view", "crm.manage", "support.view", "support.manage"],
};

export type StaffProfile = {
  id: string;
  email: string;
  name: string;
  displayName: string;
  staffRole: StaffRole | null;
  staffDisabledAt: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  permissions: Permission[];
};

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return value === "owner" || value === "admin" || value === "moderator" || value === "support";
}

export function parsePermissionsJson(raw: string | null | undefined): Permission[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is Permission => PERMISSIONS.includes(item as Permission));
  } catch {
    return null;
  }
}

/** Permissions that may be assigned to non-owner staff. OWNER-only caps stay out. */
export const ASSIGNABLE_PERMISSIONS: readonly Permission[] = PERMISSIONS.filter(
  (perm) => perm !== "admins.manage",
);

export function sanitizeAssignablePermissions(input: Permission[] | null | undefined): Permission[] {
  if (!input?.length) return [];
  return [...new Set(input.filter((perm) => ASSIGNABLE_PERMISSIONS.includes(perm)))];
}

export function permissionsForRole(role: StaffRole, override: Permission[] | null): Permission[] {
  if (role === "owner") return [...PERMISSIONS];
  if (override && override.length > 0) {
    return sanitizeAssignablePermissions(override);
  }
  return [...ROLE_DEFAULTS[role]];
}

export function loadStaffProfile(userId: string): StaffProfile | null {
  const row = getDb()
    .prepare(
      `SELECT id, email, name, display_name, staff_role, staff_permissions, staff_disabled_at, is_admin, email_verified
       FROM users WHERE id = ?`,
    )
    .get(userId) as
    | {
        id: string;
        email: string;
        name: string;
        display_name: string | null;
        staff_role: string | null;
        staff_permissions: string | null;
        staff_disabled_at: string | null;
        is_admin: number;
        email_verified: number;
      }
    | undefined;
  if (!row) return null;

  let role: StaffRole | null = isStaffRole(row.staff_role) ? row.staff_role : null;
  if (!role && row.is_admin === 1) role = "admin";

  const permissions = role ? permissionsForRole(role, parsePermissionsJson(row.staff_permissions)) : [];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    displayName: row.display_name?.trim() || row.name,
    staffRole: role,
    staffDisabledAt: row.staff_disabled_at,
    isAdmin: Boolean(role) && !row.staff_disabled_at,
    emailVerified: row.email_verified !== 0,
    permissions,
  };
}

export function hasPermission(profile: StaffProfile, permission: Permission): boolean {
  if (!profile.staffRole || profile.staffDisabledAt) return false;
  if (profile.staffRole === "owner") return true;
  // Staff management is OWNER-only even if a stale override listed the cap.
  if (permission === "admins.manage") return false;
  return profile.permissions.includes(permission);
}

export function assertPermission(profile: StaffProfile, permission: Permission): void {
  if (!hasPermission(profile, permission)) {
    throw new ForbiddenError();
  }
}

export function assertOwner(profile: StaffProfile): void {
  if (profile.staffRole !== "owner" || profile.staffDisabledAt) {
    throw new ForbiddenError();
  }
}

export function isOwnerUser(userId: string): boolean {
  const row = getDb().prepare(`SELECT staff_role FROM users WHERE id = ?`).get(userId) as
    | { staff_role: string | null }
    | undefined;
  return row?.staff_role === "owner";
}

export function roleLabel(role: StaffRole | null): string {
  if (role === "owner") return "OWNER";
  if (role === "admin") return "ADMIN";
  if (role === "moderator") return "MODERATOR";
  if (role === "support") return "SUPPORT";
  return "USER";
}
