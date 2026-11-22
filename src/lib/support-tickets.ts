import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export const TICKET_CATEGORIES = [
  "account",
  "listings",
  "subscriptions",
  "ai",
  "technical",
  "complaints",
  "other",
] as const;

export function listTickets(limit = 100) {
  return getDb()
    .prepare(
      `SELECT t.*, u.email, u.name FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.updated_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    user_id: string;
    email: string;
    name: string;
    category: string;
    subject: string;
    status: string;
    priority: string;
    assignee_id: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

export function createTicket(input: {
  userId: string;
  category: string;
  subject: string;
  body: string;
  actorId: string;
}): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO support_tickets (id, user_id, category, subject, status, priority, assignee_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'open', 'normal', NULL, ?, ?)`,
    )
    .run(id, input.userId, input.category, input.subject, now, now);
  getDb()
    .prepare(
      `INSERT INTO support_ticket_messages (id, ticket_id, author_id, body, internal, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    )
    .run(randomUUID(), id, input.actorId, input.body, now);
  writeAudit(input.actorId, "ticket.create", "ticket", id, { user_id: input.userId });
  return id;
}

export function getTicket(id: string) {
  const ticket = getDb()
    .prepare(
      `SELECT t.*, u.email, u.name FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
    )
    .get(id) as
    | {
        id: string;
        user_id: string;
        email: string;
        name: string;
        category: string;
        subject: string;
        status: string;
        priority: string;
        assignee_id: string | null;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!ticket) throw new NotFoundError();
  const messages = getDb()
    .prepare(
      `SELECT m.*, u.name AS author_name, u.display_name FROM support_ticket_messages m
       JOIN users u ON u.id = m.author_id WHERE m.ticket_id = ? ORDER BY m.created_at ASC`,
    )
    .all(id) as Array<{
    id: string;
    author_id: string;
    author_name: string;
    display_name: string | null;
    body: string;
    internal: number;
    created_at: string;
  }>;
  return { ticket, messages };
}

export function updateTicket(
  actorId: string,
  ticketId: string,
  patch: { status?: string; priority?: string; assigneeId?: string | null },
): void {
  const now = new Date().toISOString();
  const current = getDb().prepare(`SELECT id FROM support_tickets WHERE id = ?`).get(ticketId);
  if (!current) throw new NotFoundError();
  if (patch.status) {
    getDb().prepare(`UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?`).run(patch.status, now, ticketId);
  }
  if (patch.priority) {
    getDb()
      .prepare(`UPDATE support_tickets SET priority = ?, updated_at = ? WHERE id = ?`)
      .run(patch.priority, now, ticketId);
  }
  if (patch.assigneeId !== undefined) {
    getDb()
      .prepare(`UPDATE support_tickets SET assignee_id = ?, updated_at = ? WHERE id = ?`)
      .run(patch.assigneeId, now, ticketId);
  }
  writeAudit(actorId, "ticket.update", "ticket", ticketId, {
    status: patch.status ?? null,
    priority: patch.priority ?? null,
  });
}

export function addTicketMessage(
  actorId: string,
  ticketId: string,
  body: string,
  internal: boolean,
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO support_ticket_messages (id, ticket_id, author_id, body, internal, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), ticketId, actorId, body, internal ? 1 : 0, now);
  getDb().prepare(`UPDATE support_tickets SET updated_at = ? WHERE id = ?`).run(now, ticketId);
}
