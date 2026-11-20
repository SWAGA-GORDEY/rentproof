import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

export function writeAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  meta?: Record<string, string | number | null> | null,
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      actorId,
      action,
      entityType,
      entityId,
      meta ? JSON.stringify(meta) : null,
      new Date().toISOString(),
    );
}

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: string | null;
  createdAt: string;
};

export function listAuditForActor(actorId: string, limit: number): AuditEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT id, action, entity_type, entity_id, meta, created_at
       FROM audit_log WHERE actor_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(actorId, limit) as Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    meta: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    meta: row.meta,
    createdAt: row.created_at,
  }));
}

export function listRecentAudit(limit: number): Array<AuditEntry & { actorId: string | null }> {
  const rows = getDb()
    .prepare(
      `SELECT id, actor_id, action, entity_type, entity_id, meta, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    meta: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    meta: row.meta,
    createdAt: row.created_at,
  }));
}
