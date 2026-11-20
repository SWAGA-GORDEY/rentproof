import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { notifyUser } from "@/lib/notifications";

export type ComplaintRecord = {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: "listing" | "review" | "user";
  targetId: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  resolution: string | null;
  createdAt: string;
};

export function createComplaint(
  reporterId: string,
  targetType: "listing" | "review" | "user",
  targetId: string,
  reason: string,
): string {
  if (!targetExists(targetType, targetId)) {
    throw new NotFoundError();
  }
  const id = randomUUID();
  try {
    getDb()
      .prepare(
        `INSERT INTO complaints (id, reporter_id, target_type, target_id, reason, status, resolution, created_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, 'open', NULL, ?, NULL)`,
      )
      .run(id, reporterId, targetType, targetId, reason, new Date().toISOString());
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new ConflictError("duplicate");
    }
    throw error;
  }
  writeAudit(reporterId, "complaint.create", targetType, targetId, null);
  const admins = getDb().prepare("SELECT id FROM users WHERE is_admin = 1 AND blocked_at IS NULL").all() as Array<{ id: string }>;
  for (const admin of admins) {
    notifyUser(admin.id, {
      kind: "complaint",
      title: "Новая жалоба",
      body: reason.slice(0, 180),
      href: "/admin/reports",
    });
  }
  return id;
}

export function listComplaints(status?: "open" | "resolved" | "dismissed"): ComplaintRecord[] {
  const rows = status
    ? (getDb()
        .prepare(
          `SELECT complaints.*, users.name AS reporter_name
           FROM complaints JOIN users ON users.id = complaints.reporter_id
           WHERE complaints.status = ? ORDER BY complaints.created_at DESC`,
        )
        .all(status) as ComplaintRow[])
    : (getDb()
        .prepare(
          `SELECT complaints.*, users.name AS reporter_name
           FROM complaints JOIN users ON users.id = complaints.reporter_id
           ORDER BY complaints.created_at DESC LIMIT 200`,
        )
        .all() as ComplaintRow[]);
  return rows.map(mapComplaint);
}

export function resolveComplaint(adminId: string, complaintId: string, status: "resolved" | "dismissed", resolution: string): void {
  const row = getDb().prepare("SELECT reporter_id, status FROM complaints WHERE id = ?").get(complaintId) as
    | { reporter_id: string; status: string }
    | undefined;
  if (!row) {
    throw new NotFoundError();
  }
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE complaints SET status = ?, resolution = ?, resolved_at = ? WHERE id = ?")
    .run(status, resolution, now, complaintId);
  writeAudit(adminId, "complaint.resolve", "complaint", complaintId, { status });
  notifyUser(row.reporter_id, {
    kind: "complaint",
    title: status === "resolved" ? "Жалоба рассмотрена" : "Жалоба отклонена",
    body: resolution,
    href: "/account",
  });
}

export function saveContactMessage(name: string, email: string, message: string): void {
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO contact_messages (id, name, email, message, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, email, message, new Date().toISOString());
  const admins = getDb().prepare("SELECT id FROM users WHERE is_admin = 1 AND blocked_at IS NULL").all() as Array<{ id: string }>;
  for (const admin of admins) {
    notifyUser(admin.id, {
      kind: "contact",
      title: "Сообщение с формы контактов",
      body: `${name}: ${message.slice(0, 160)}`,
      href: "/admin",
    });
  }
}

function targetExists(targetType: "listing" | "review" | "user", targetId: string): boolean {
  const table = targetType === "listing" ? "listings" : targetType === "review" ? "reviews" : "users";
  const row = getDb().prepare(`SELECT id FROM ${table} WHERE id = ?`).get(targetId);
  return Boolean(row);
}

type ComplaintRow = {
  id: string;
  reporter_id: string;
  reporter_name: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

function mapComplaint(row: ComplaintRow): ComplaintRecord {
  if (row.target_type !== "listing" && row.target_type !== "review" && row.target_type !== "user") {
    throw new Error("Unknown complaint target");
  }
  if (row.status !== "open" && row.status !== "resolved" && row.status !== "dismissed") {
    throw new Error("Unknown complaint status");
  }
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.created_at,
  };
}
