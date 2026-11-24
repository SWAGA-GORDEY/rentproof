import { databasePath, getDb, resolveDbDriver } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import { billingStatus, plans } from "@/lib/plans";
import { existsSync } from "node:fs";

function count(sql: string, ...params: Array<string | number | null>): number {
  const row = getDb().prepare(sql).get(...params) as { c: number };
  return Number(row.c);
}

export function dccDashboard() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 864e5).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 864e5).toISOString();

  const planDistribution = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    users: count(`SELECT COUNT(*) AS c FROM users WHERE plan = ?`, plan.id),
  }));

  const registrationsByDay: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    const next = new Date(now.getTime() - (i - 1) * 864e5).toISOString().slice(0, 10);
    registrationsByDay.push({
      day,
      count: count(`SELECT COUNT(*) AS c FROM users WHERE created_at >= ? AND created_at < ?`, day, next),
    });
  }

  const listingsByDay: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    const next = new Date(now.getTime() - (i - 1) * 864e5).toISOString().slice(0, 10);
    listingsByDay.push({
      day,
      count: count(`SELECT COUNT(*) AS c FROM listings WHERE created_at >= ? AND created_at < ?`, day, next),
    });
  }

  const aiByDay: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    const next = new Date(now.getTime() - (i - 1) * 864e5).toISOString().slice(0, 10);
    aiByDay.push({
      day,
      count: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ? AND created_at < ?`, day, next),
    });
  }

  const revenueByDay: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    const next = new Date(now.getTime() - (i - 1) * 864e5).toISOString().slice(0, 10);
    const row = getDb()
      .prepare(
        `SELECT COALESCE(SUM(amount_kopecks), 0) AS s FROM payments
         WHERE status = 'succeeded' AND created_at >= ? AND created_at < ?`,
      )
      .get(day, next) as { s: number };
    revenueByDay.push({ day, count: Number(row.s) });
  }

  const activeUsersByDay: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    const next = new Date(now.getTime() - (i - 1) * 864e5).toISOString().slice(0, 10);
    activeUsersByDay.push({
      day,
      count: count(
        `SELECT COUNT(*) AS c FROM users WHERE last_login_at IS NOT NULL AND last_login_at >= ? AND last_login_at < ?`,
        day,
        next,
      ),
    });
  }

  const billing = billingStatus();
  const dbPath = databasePath();

  return {
    users: {
      total: count(`SELECT COUNT(*) AS c FROM users`),
      today: count(`SELECT COUNT(*) AS c FROM users WHERE created_at >= ?`, dayAgo),
      week: count(`SELECT COUNT(*) AS c FROM users WHERE created_at >= ?`, weekAgo),
      month: count(`SELECT COUNT(*) AS c FROM users WHERE created_at >= ?`, monthAgo),
      active: count(`SELECT COUNT(*) AS c FROM users WHERE blocked_at IS NULL AND account_status = 'active'`),
      blocked: count(`SELECT COUNT(*) AS c FROM users WHERE blocked_at IS NOT NULL`),
      staff: count(`SELECT COUNT(*) AS c FROM users WHERE staff_role IS NOT NULL AND staff_role != ''`),
    },
    listings: {
      total: count(`SELECT COUNT(*) AS c FROM listings`),
      published: count(`SELECT COUNT(*) AS c FROM listings WHERE status = 'published'`),
      drafts: count(`SELECT COUNT(*) AS c FROM listings WHERE status = 'draft'`),
      pending: count(`SELECT COUNT(*) AS c FROM listings WHERE status = 'pending'`),
      archived: count(`SELECT COUNT(*) AS c FROM listings WHERE status = 'archived'`),
    },
    complaintsOpen: count(`SELECT COUNT(*) AS c FROM complaints WHERE status = 'open'`),
    subscriptionsActive: count(
      `SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active' AND plan IN ('plus','pro')`,
    ),
    subscriptionsPlus: count(
      `SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active' AND plan = 'plus'`,
    ),
    subscriptionsPro: count(
      `SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active' AND plan = 'pro'`,
    ),
    paymentsSucceeded: count(`SELECT COUNT(*) AS c FROM payments WHERE status = 'succeeded'`),
    revenueMonthKopecks: Number(
      (
        getDb()
          .prepare(
            `SELECT COALESCE(SUM(amount_kopecks), 0) AS s FROM payments WHERE status = 'succeeded' AND created_at >= ?`,
          )
          .get(monthAgo) as { s: number }
      ).s,
    ),
    ai: {
      total: count(`SELECT COUNT(*) AS c FROM ai_reports`),
      month: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ?`, monthAgo),
      day: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ?`, dayAgo),
      users: count(`SELECT COUNT(DISTINCT user_id) AS c FROM ai_reports`),
      errors: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE status = 'unavailable' OR status = 'failed'`),
    },
    planDistribution,
    charts: { registrationsByDay, listingsByDay, aiByDay, revenueByDay, activeUsersByDay },
    loginFailuresDay: count(`SELECT COUNT(*) AS c FROM login_attempts WHERE attempted_at >= ?`, dayAgo),
    health: {
      // SQLite: file on disk. Postgres: connection already opened via getDb().
      database: resolveDbDriver() === "postgres" ? "ok" : existsSync(dbPath) ? "ok" : "missing",
      email: (() => {
        if (!mailConfigured()) return "console";
        const driver = (process.env.MAIL_DRIVER ?? "auto").trim().toLowerCase();
        if (driver === "resend" || (driver === "auto" && process.env.RESEND_API_KEY?.trim())) return "resend";
        if (driver === "smtp" || process.env.SMTP_HOST?.trim()) return "smtp";
        return "configured";
      })(),
      backend: "ok",
      frontend: "ok",
      payments: billing.chargesEnabled ? `${billing.provider}:${billing.mode}` : "off",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
  };
}

function sumSucceededKopecks(sinceIso: string | null): number {
  const row = sinceIso
    ? (getDb()
        .prepare(
          `SELECT COALESCE(SUM(amount_kopecks), 0) AS s FROM payments WHERE status = 'succeeded' AND created_at >= ?`,
        )
        .get(sinceIso) as { s: number })
    : (getDb()
        .prepare(`SELECT COALESCE(SUM(amount_kopecks), 0) AS s FROM payments WHERE status = 'succeeded'`)
        .get() as { s: number });
  return Number(row.s);
}

export function dccFinance() {
  const now = Date.now();
  const dayAgo = new Date(now - 864e5).toISOString();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();
  const monthAgo = new Date(now - 30 * 864e5).toISOString();

  const plus = count(`SELECT COUNT(*) AS c FROM users WHERE plan = 'plus'`);
  const pro = count(`SELECT COUNT(*) AS c FROM users WHERE plan = 'pro'`);
  const free = count(`SELECT COUNT(*) AS c FROM users WHERE plan = 'free' OR plan IS NULL OR plan = ''`);
  const plusPaid = count(
    `SELECT COUNT(*) AS c FROM users u
     JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
     WHERE u.plan = 'plus' AND s.source_kind = 'paid'`,
  );
  const proPaid = count(
    `SELECT COUNT(*) AS c FROM users u
     JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
     WHERE u.plan = 'pro' AND s.source_kind = 'paid'`,
  );
  const plusPrice = plans.find((p) => p.id === "plus")?.price ?? 299;
  const proPrice = plans.find((p) => p.id === "pro")?.price ?? 799;
  // Potential from PAID plans only — owner/admin grants are not revenue.
  const potentialMonthlyPaidOnly = plusPaid * plusPrice + proPaid * proPrice;
  const paidTx = count(`SELECT COUNT(*) AS c FROM payments WHERE status = 'succeeded'`);
  const failedTx = count(`SELECT COUNT(*) AS c FROM payments WHERE status IN ('canceled','failed')`);
  const refunds = count(`SELECT COUNT(*) AS c FROM refunds WHERE status = 'succeeded'`);
  const billing = billingStatus();
  return {
    free,
    plus,
    pro,
    plusPaid,
    proPaid,
    potentialMonthly: potentialMonthlyPaidOnly,
    paidTransactions: paidTx,
    failedTransactions: failedTx,
    refundsSucceeded: refunds,
    revenueKopecks: {
      today: sumSucceededKopecks(dayAgo),
      week: sumSucceededKopecks(weekAgo),
      month: sumSucceededKopecks(monthAgo),
      allTime: sumSucceededKopecks(null),
    },
    billing,
    note: "Выручка только из payments.status=succeeded. OWNER_GRANT / ADMIN_GRANTED в выручку не входят.",
  };
}

export function dccAiCenter() {
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString();
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const byPlan = ["free", "plus", "pro"].map((plan) => ({
    plan,
    reports: count(
      `SELECT COUNT(*) AS c FROM ai_reports r JOIN users u ON u.id = r.user_id WHERE u.plan = ?`,
      plan,
    ),
  }));
  const recentErrors = getDb()
    .prepare(
      `SELECT id, user_id, status, created_at FROM ai_reports
       WHERE status IN ('unavailable','failed') ORDER BY created_at DESC LIMIT 20`,
    )
    .all() as Array<{ id: string; user_id: string; status: string; created_at: string }>;
  const recentOk = count(
    `SELECT COUNT(*) AS c FROM ai_reports WHERE status NOT IN ('unavailable','failed') AND created_at >= ?`,
    monthAgo,
  );
  return {
    model: process.env.OPENAI_MODEL?.trim() || "gpt-6-luna",
    baseUrlHost: (() => {
      try {
        return new URL(process.env.OPENAI_BASE_URL || "https://tokenlavka.com/v1").host;
      } catch {
        return "unset";
      }
    })(),
    keyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    // Orientational only — no vendor billing API wired; do not treat as invoice.
    budgetRubHint: null as number | null,
    totals: {
      all: count(`SELECT COUNT(*) AS c FROM ai_reports`),
      month: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ?`, monthAgo),
      day: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ?`, dayAgo),
      activeUsers: count(`SELECT COUNT(DISTINCT user_id) AS c FROM ai_reports WHERE created_at >= ?`, monthAgo),
      errors: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE status IN ('unavailable','failed')`),
      succeededMonth: recentOk,
    },
    byPlan,
    recentErrors,
    limits: {
      free: Number(process.env.RENTPROOF_PLAN_FREE_AI ?? 5),
      plus: Number(process.env.RENTPROOF_PLAN_PLUS_AI ?? 40),
      pro: Number(process.env.RENTPROOF_PLAN_PRO_AI ?? 150),
    },
    availability: process.env.RENTPROOF_AI_ENABLED === "0" ? "disabled_by_env" : "enabled",
  };
}

export function dccSecurityCenter() {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const ownerActions = getDb()
    .prepare(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, u.email AS actor_email
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE u.staff_role = 'owner' OR a.action LIKE 'owner.%'
       ORDER BY a.created_at DESC LIMIT 40`,
    )
    .all() as Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
    actor_email: string | null;
  }>;
  const adminActions = getDb()
    .prepare(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, u.email AS actor_email
       FROM audit_log a
       JOIN users u ON u.id = a.actor_id
       WHERE u.staff_role IN ('admin','moderator','support')
       ORDER BY a.created_at DESC LIMIT 40`,
    )
    .all() as Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
    actor_email: string | null;
  }>;
  const recentBans = getDb()
    .prepare(
      `SELECT id, user_id, kind, reason, created_at, lifted_at FROM account_bans ORDER BY created_at DESC LIMIT 30`,
    )
    .all() as Array<{
    id: string;
    user_id: string;
    kind: string;
    reason: string;
    created_at: string;
    lifted_at: string | null;
  }>;
  const roleChanges = getDb()
    .prepare(
      `SELECT id, action, entity_id, created_at, meta FROM audit_log
       WHERE action LIKE 'staff.%' OR action LIKE 'owner.%'
       ORDER BY created_at DESC LIMIT 30`,
    )
    .all() as Array<{
    id: string;
    action: string;
    entity_id: string | null;
    created_at: string;
    meta: string | null;
  }>;
  return {
    loginFailuresDay: count(`SELECT COUNT(*) AS c FROM login_attempts WHERE attempted_at >= ?`, dayAgo),
    loginFailuresWeek: count(`SELECT COUNT(*) AS c FROM login_attempts WHERE attempted_at >= ?`, weekAgo),
    activeBans: count(`SELECT COUNT(*) AS c FROM account_bans WHERE lifted_at IS NULL`),
    ownerActions,
    adminActions,
    recentBans,
    roleChanges,
  };
}

export function dccEmailCenter() {
  const driver = (process.env.MAIL_DRIVER ?? "auto").trim().toLowerCase();
  const resendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const smtpHost = Boolean(process.env.SMTP_HOST?.trim());
  let active: "resend" | "smtp" | "console" | "auto-unresolved" = "console";
  if (driver === "resend" || (driver === "auto" && resendKey)) active = "resend";
  else if (driver === "smtp" || (driver === "auto" && smtpHost)) active = "smtp";
  else if (driver === "console") active = "console";
  else if (driver === "auto") active = "auto-unresolved";

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const verificationIssued = count(
    `SELECT COUNT(*) AS c FROM audit_log WHERE action LIKE 'email.%' AND created_at >= ?`,
    weekAgo,
  );
  const passwordResets = count(
    `SELECT COUNT(*) AS c FROM audit_log WHERE action LIKE 'password.%' AND created_at >= ?`,
    weekAgo,
  );
  const deliveredWeek = count(
    `SELECT COUNT(*) AS c FROM mail_delivery_log WHERE delivered = 1 AND created_at >= ?`,
    weekAgo,
  );
  const failedWeek = count(
    `SELECT COUNT(*) AS c FROM mail_delivery_log WHERE delivered = 0 AND created_at >= ?`,
    weekAgo,
  );
  const recent = getDb()
    .prepare(
      `SELECT id, adapter, recipient_domain, subject, delivered, error_code, created_at
       FROM mail_delivery_log ORDER BY created_at DESC LIMIT 20`,
    )
    .all() as Array<{
    id: string;
    adapter: string;
    recipient_domain: string;
    subject: string;
    delivered: number;
    error_code: string | null;
    created_at: string;
  }>;
  return {
    configured: mailConfigured(),
    driverEnv: driver,
    active,
    resendKeyPresent: resendKey,
    smtpHostPresent: smtpHost,
    fromAddress: process.env.MAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || "(default)",
    week: {
      verificationAndEmailAudit: verificationIssued,
      passwordRelatedAudit: passwordResets,
      delivered: deliveredWeek,
      failedOrConsole: failedWeek,
    },
    recentDeliveries: recent.map((row) => ({
      id: row.id,
      adapter: row.adapter,
      recipientDomain: row.recipient_domain,
      subject: row.subject,
      delivered: row.delivered === 1,
      errorCode: row.error_code,
      createdAt: row.created_at,
    })),
    note: "Тела писем и коды не хранятся. delivered=true только при подтверждённом ответе провайдера (например id от Resend).",
  };
}
