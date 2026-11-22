import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError, PlanLimitError } from "@/lib/errors";
import { planCustomerLimit } from "@/lib/plans";
import { readPlan } from "@/lib/subscriptions";

export type CustomerRecord = {
  id: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export function createCustomer(ownerId: string, input: CustomerInput): string {
  assertCustomerCapacity(ownerId);
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO customers (id, owner_id, name, email, phone, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(id, ownerId, input.name, input.email, input.phone, input.notes, now, now);
  writeAudit(ownerId, "customer.create", "customer", id, null);
  return id;
}

export function updateCustomer(ownerId: string, customerId: string, input: CustomerInput): void {
  const current = requireOwnedCustomer(ownerId, customerId);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE customers SET name = ?, email = ?, phone = ?, notes = ?, updated_at = ? WHERE id = ? AND owner_id = ?`,
    )
    .run(input.name, input.email, input.phone, input.notes, now, customerId, ownerId);
  writeAudit(ownerId, "customer.update", "customer", current.id, null);
}

export function archiveCustomer(ownerId: string, customerId: string): void {
  requireOwnedCustomer(ownerId, customerId);
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE customers SET status = 'archived', updated_at = ? WHERE id = ? AND owner_id = ?`)
    .run(now, customerId, ownerId);
  writeAudit(ownerId, "customer.archive", "customer", customerId, null);
}

export function addCustomerInteraction(ownerId: string, customerId: string, kind: string, body: string): string {
  requireOwnedCustomer(ownerId, customerId);
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO customer_interactions (id, customer_id, owner_id, kind, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, customerId, ownerId, kind, body, new Date().toISOString());
  return id;
}

export function listCustomers(ownerId: string, q = ""): CustomerRecord[] {
  const query = q.trim().toLowerCase();
  const rows = getDb()
    .prepare(
      `SELECT * FROM customers WHERE owner_id = ? AND status = 'active'
       ORDER BY updated_at DESC LIMIT 500`,
    )
    .all(ownerId) as Array<{
    id: string;
    owner_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows
    .map(mapCustomer)
    .filter((item) => {
      if (!query) return true;
      return `${item.name} ${item.email ?? ""} ${item.phone ?? ""}`.toLowerCase().includes(query);
    });
}

export function getCustomer(ownerId: string, customerId: string): CustomerRecord | null {
  try {
    return requireOwnedCustomer(ownerId, customerId);
  } catch {
    return null;
  }
}

export function listCustomerInteractions(ownerId: string, customerId: string) {
  requireOwnedCustomer(ownerId, customerId);
  return getDb()
    .prepare(
      `SELECT id, kind, body, created_at FROM customer_interactions
       WHERE customer_id = ? AND owner_id = ? ORDER BY created_at DESC LIMIT 100`,
    )
    .all(customerId, ownerId) as Array<{ id: string; kind: string; body: string; created_at: string }>;
}

export function countCustomers(ownerId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM customers WHERE owner_id = ? AND status = 'active'`)
    .get(ownerId) as { count: number };
  return Number(row.count);
}

function assertCustomerCapacity(ownerId: string): void {
  const plan = readPlan(ownerId);
  const limit = planCustomerLimit(plan);
  if (countCustomers(ownerId) >= limit) {
    throw new PlanLimitError(plan, limit);
  }
}

function requireOwnedCustomer(ownerId: string, customerId: string): CustomerRecord {
  const row = getDb().prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId) as
    | {
        id: string;
        owner_id: string;
        name: string;
        email: string | null;
        phone: string | null;
        notes: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!row) {
    throw new NotFoundError();
  }
  if (row.owner_id !== ownerId) {
    throw new ForbiddenError();
  }
  return mapCustomer(row);
}

function mapCustomer(row: {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}): CustomerRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    status: row.status === "archived" ? "archived" : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
