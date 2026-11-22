import { Suspense } from "react";
import Link from "next/link";
import { cancelRenewalAction } from "@/app/actions/payments";
import { primaryButton, secondaryButton } from "@/components/styles";
import { countCustomers } from "@/lib/customers";
import { requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { getDb } from "@/lib/db";
import {
  billingStatus,
  planAiLimit,
  planCustomerLimit,
  planHistoryLimit,
  planListingLimit,
  plans,
} from "@/lib/plans";
import { currentSubscription } from "@/lib/payments";
import { listSubscriptionHistory, readPlan } from "@/lib/subscriptions";

export const metadata = { title: "Моя подписка" };

export default function AccountSubscriptionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем подписку…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const plan = readPlan(user.id);
  const sub = currentSubscription(user.id);
  const history = listSubscriptionHistory(user.id);
  const billing = billingStatus();
  const planMeta = plans.find((item) => item.id === plan);
  const listingsUsed = Number(
    (getDb().prepare(`SELECT COUNT(*) AS c FROM listings WHERE owner_id = ? AND status != 'archived'`).get(user.id) as { c: number })
      .c,
  );
  const aiUsed = Number(
    (getDb().prepare(`SELECT COUNT(*) AS c FROM ai_reports WHERE user_id = ?`).get(user.id) as { c: number }).c,
  );
  const customersUsed = countCustomers(user.id);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Моя подписка</h1>
        <p className="mt-2 text-sm text-muted">
          Провайдер: {billing.provider}. Автопродление выключено. Платный статус не выдаётся без подтверждённой оплаты.
        </p>
      </div>
      <div className="rounded-3xl border border-line bg-white p-6">
        <p className="text-xs font-semibold uppercase text-accent">Текущий тариф</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-navy">{planMeta?.name ?? plan}</h2>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>Статус записи: {sub?.status ?? "—"}</li>
          <li>Продление: {sub?.renewalStatus === "off" || !sub ? "отключено" : sub.renewalStatus}</li>
          <li>Действует до: {sub?.expiresAt ? formatDateRu(sub.expiresAt) : "бессрочно (Free)"}</li>
        </ul>
        <div className="mt-6 grid gap-2 text-sm text-ink">
          <p>
            Объявления: {listingsUsed} / {planListingLimit(plan)}
          </p>
          <p>
            Клиенты: {customersUsed} / {planCustomerLimit(plan)}
          </p>
          <p>
            ИИ-отчёты: {aiUsed} / {planAiLimit(plan)}
          </p>
          <p>История заявок: до {planHistoryLimit(plan)} записей</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className={primaryButton}>
            Сравнить тарифы
          </Link>
          <Link href="/account/payments" className={secondaryButton}>
            Платежи
          </Link>
          <form action={cancelRenewalAction}>
            <button className={secondaryButton} type="submit">
              Отключить продление
            </button>
          </form>
        </div>
      </div>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">История подписок</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {history.length === 0 ? <li className="text-muted">Записей пока нет.</li> : null}
          {history.map((item) => (
            <li key={item.id} className="rounded-2xl bg-mist/50 p-3">
              <p className="font-semibold text-ink">
                {item.plan.toUpperCase()} · {item.status} · {item.mode}
              </p>
              <p className="text-muted">
                с {item.started_at ? formatDateRu(item.started_at) : formatDateRu(item.created_at)}
                {item.expires_at ? ` до ${formatDateRu(item.expires_at)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
