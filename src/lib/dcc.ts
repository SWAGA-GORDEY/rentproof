import { getDb } from "@/lib/db";
import { databasePath } from "@/lib/db";
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
      errors: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE status = 'unavailable' OR status = 'error'`),
    },
    planDistribution,
    charts: { registrationsByDay, listingsByDay, aiByDay },
    health: {
      database: existsSync(dbPath) ? "ok" : "missing",
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
    budgetRubHint: 500,
    totals: {
      all: count(`SELECT COUNT(*) AS c FROM ai_reports`),
      month: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ?`, monthAgo),
      day: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE created_at >= ?`, dayAgo),
      activeUsers: count(`SELECT COUNT(DISTINCT user_id) AS c FROM ai_reports WHERE created_at >= ?`, monthAgo),
      errors: count(`SELECT COUNT(*) AS c FROM ai_reports WHERE status IN ('unavailable','error')`),
    },
    byPlan,
    limits: {
      free: Number(process.env.RENTPROOF_PLAN_FREE_AI ?? 5),
      plus: Number(process.env.RENTPROOF_PLAN_PLUS_AI ?? 40),
      pro: Number(process.env.RENTPROOF_PLAN_PRO_AI ?? 150),
    },
  };
}
