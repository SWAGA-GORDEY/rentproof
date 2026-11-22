import { writeAudit } from "@/lib/audit";
import { notifyAdminAudience } from "@/lib/admin-notifications";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  isStaffRole,
  loadStaffProfile,
  permissionsForRole,
  sanitizeAssignablePermissions,
  type Permission,
  type StaffRole,
} from "@/lib/rbac";

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  displayName: string;
  staffRole: StaffRole;
  permissions: Permission[];
  staffDisabledAt: string | null;
  createdAt: string;
};

function assertOwnerActor(actorId: string): void {
  const actor = loadStaffProfile(actorId);
  if (!actor || actor.staffRole !== "owner" || actor.staffDisabledAt) {
    throw new ForbiddenError();
  }
}

export function listStaff(): StaffMember[] {
  const rows = getDb()
    .prepare(
      `SELECT id, email, name, display_name, staff_role, staff_permissions, staff_disabled_at, created_at
       FROM users WHERE staff_role IS NOT NULL AND staff_role != ''
       ORDER BY CASE staff_role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, created_at`,
    )
    .all() as Array<{
    id: string;
    email: string;
    name: string;
    display_name: string | null;
    staff_role: string;
    staff_permissions: string | null;
    staff_disabled_at: string | null;
    created_at: string;
  }>;

  return rows.filter((row) => isStaffRole(row.staff_role)).map((row) => {
    const role = row.staff_role as StaffRole;
    let override: Permission[] | null = null;
    if (row.staff_permissions) {
      try {
        override = JSON.parse(row.staff_permissions) as Permission[];
      } catch {
        override = null;
      }
    }
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      displayName: row.display_name?.trim() || row.name,
      staffRole: role,
      permissions: permissionsForRole(role, override),
      staffDisabledAt: row.staff_disabled_at,
      createdAt: row.created_at,
    };
  });
}

export function assignStaff(input: {
  actorId: string;
  email: string;
  role: StaffRole;
  displayName?: string;
  permissions?: Permission[];
}): void {
  assertOwnerActor(input.actorId);
  if (input.role === "owner") throw new ForbiddenError();
  const email = input.email.trim().toLowerCase();
  const target = getDb()
    .prepare(`SELECT id, staff_role, email_verified FROM users WHERE email = ?`)
    .get(email) as { id: string; staff_role: string | null; email_verified: number } | undefined;
  if (!target) throw new NotFoundError();
  if (target.id === input.actorId) throw new ForbiddenError();
  if (target.staff_role === "owner") throw new ForbiddenError();
  if (target.email_verified === 0) throw new ForbiddenError();

  const perms = sanitizeAssignablePermissions(input.permissions);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE users SET staff_role = ?, is_admin = 1, display_name = ?, staff_permissions = ?,
       staff_disabled_at = NULL, updated_at = ? WHERE id = ?`,
    )
    .run(
      input.role,
      input.displayName?.trim() || null,
      perms.length ? JSON.stringify(perms) : null,
      now,
      target.id,
    );
  writeAudit(input.actorId, "staff.assign", "user", target.id, {
    role: input.role,
    email,
  });
  notifyAdminAudience({
    kind: "staff",
    title: "Назначен сотрудник",
    body: `${email} → ${input.role}`,
    href: "/admin/staff",
  });
}

export function updateStaff(input: {
  actorId: string;
  userId: string;
  role?: StaffRole;
  displayName?: string;
  permissions?: Permission[] | null;
  disabled?: boolean;
}): void {
  assertOwnerActor(input.actorId);
  if (input.userId === input.actorId) throw new ForbiddenError();
  const target = getDb()
    .prepare(`SELECT id, staff_role FROM users WHERE id = ?`)
    .get(input.userId) as { id: string; staff_role: string | null } | undefined;
  if (!target) throw new NotFoundError();
  if (target.staff_role === "owner") throw new ForbiddenError();
  if (input.role === "owner") throw new ForbiddenError();

  const now = new Date().toISOString();
  if (input.role) {
    getDb().prepare(`UPDATE users SET staff_role = ?, is_admin = 1, updated_at = ? WHERE id = ?`).run(
      input.role,
      now,
      input.userId,
    );
  }
  if (input.displayName !== undefined) {
    getDb()
      .prepare(`UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?`)
      .run(input.displayName.trim() || null, now, input.userId);
  }
  if (input.permissions !== undefined) {
    const perms = sanitizeAssignablePermissions(input.permissions);
    getDb()
      .prepare(`UPDATE users SET staff_permissions = ?, updated_at = ? WHERE id = ?`)
      .run(perms.length ? JSON.stringify(perms) : null, now, input.userId);
  }
  if (input.disabled === true) {
    getDb().prepare(`UPDATE users SET staff_disabled_at = ?, updated_at = ? WHERE id = ?`).run(now, now, input.userId);
  }
  if (input.disabled === false) {
    getDb().prepare(`UPDATE users SET staff_disabled_at = NULL, updated_at = ? WHERE id = ?`).run(now, input.userId);
  }
  writeAudit(input.actorId, "staff.update", "user", input.userId, {
    role: input.role ?? null,
    disabled: input.disabled == null ? null : input.disabled ? 1 : 0,
  });
}

export function revokeStaff(actorId: string, userId: string): void {
  assertOwnerActor(actorId);
  if (userId === actorId) throw new ForbiddenError();
  const target = getDb()
    .prepare(`SELECT id, staff_role FROM users WHERE id = ?`)
    .get(userId) as { id: string; staff_role: string | null } | undefined;
  if (!target) throw new NotFoundError();
  if (target.staff_role === "owner") throw new ForbiddenError();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE users SET staff_role = NULL, is_admin = 0, staff_permissions = NULL, staff_disabled_at = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .run(now, userId);
  writeAudit(actorId, "staff.revoke", "user", userId, null);
}
