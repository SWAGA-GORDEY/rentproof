import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export type SessionSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export function listUserSessions(userId: string, currentToken: string | null): SessionSummary[] {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const now = new Date().toISOString();
  const rows = getDb()
    .prepare(
      `SELECT id, token_hash, created_at, expires_at FROM sessions
       WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(userId, now) as Array<{ id: string; token_hash: string; created_at: string; expires_at: string }>;

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    current: currentHash !== null && row.token_hash === currentHash,
  }));
}

export function revokeSession(userId: string, sessionId: string, currentToken: string | null): void {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const row = getDb()
    .prepare(`SELECT id, token_hash FROM sessions WHERE id = ? AND user_id = ?`)
    .get(sessionId, userId) as { id: string; token_hash: string } | undefined;
  if (!row) {
    return;
  }
  if (currentHash && row.token_hash === currentHash) {
    throw new Error("cannot_revoke_current");
  }
  getDb().prepare(`DELETE FROM sessions WHERE id = ? AND user_id = ?`).run(sessionId, userId);
  writeAudit(userId, "session.revoke", "session", sessionId, null);
}

export function revokeOtherSessions(userId: string, currentToken: string | null): number {
  if (!currentToken) {
    const result = getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
    writeAudit(userId, "session.revoke_all", "user", userId, { keptCurrent: 0 });
    return Number(result.changes);
  }
  const result = getDb()
    .prepare(`DELETE FROM sessions WHERE user_id = ? AND token_hash != ?`)
    .run(userId, hashToken(currentToken));
  writeAudit(userId, "session.revoke_others", "user", userId, null);
  return Number(result.changes);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
