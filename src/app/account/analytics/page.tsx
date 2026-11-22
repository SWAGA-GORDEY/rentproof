import { Suspense } from "react";
import Link from "next/link";
import { secondaryButton } from "@/components/styles";
import { countCustomers } from "@/lib/customers";
import { requireUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { planAiLimit, planCustomerLimit, planListingLimit, plans } from "@/lib/plans";
import { readPlan } from "@/lib/subscriptions";

export const metadata = { title: "Аналитика" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Считаем показатели…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const plan = readPlan(user.id);
  const planMeta = plans.find((item) => item.id === plan);
  const db = getDb();

  const listings = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM listings WHERE owner_id = ? AND status != 'archived'`).get(user.id) as { c: number }).c,
  );
  const published = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM listings WHERE owner_id = ? AND status = 'published'`).get(user.id) as { c: number }).c,
  );
  const bookings = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM bookings b
           JOIN listings l ON l.id = b.listing_id
           WHERE l.owner_id = ? OR b.tenant_id = ?`,
        )
        .get(user.id, user.id) as { c: number }
    ).c,
  );
  const aiUsed = Number((db.prepare(`SELECT COUNT(*) AS c FROM ai_reports WHERE user_id = ?`).get(user.id) as { c: number }).c);
  const customers = countCustomers(user.id);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Аналитика</h1>
        <p className="mt-2 text-sm text-muted">
          Сводка по вашему аккаунту. Тариф {planMeta?.name ?? plan}. Расширенные отчёты доступны на Plus/Pro.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <Stat label="Объявления" value={`${listings} / ${planListingLimit(plan)}`} hint={`опубликовано: ${published}`} />
        <Stat label="Клиенты" value={`${customers} / ${planCustomerLimit(plan)}`} />
        <Stat label="Аренды / заявки" value={String(bookings)} />
        <Stat label="ИИ-отчёты" value={`${aiUsed} / ${planAiLimit(plan)}`} />
      </ul>
      <div className="flex flex-wrap gap-3">
        <Link href="/account/subscription" className={secondaryButton}>
          Лимиты тарифа
        </Link>
        <Link href="/account/history" className={secondaryButton}>
          История операций
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="rounded-3xl border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </li>
  );
}
