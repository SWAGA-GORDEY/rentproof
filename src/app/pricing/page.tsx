import { Suspense } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { primaryButton, secondaryButton } from "@/components/styles";
import { getCurrentUser } from "@/lib/current-user";
import { formatRubles } from "@/lib/format";
import {
  billingStatus,
  planAiLimit,
  planCustomerLimit,
  planHistoryLimit,
  planListingLimit,
  plans,
} from "@/lib/plans";
import { pageMetadata } from "@/lib/seo";
import { readPlan } from "@/lib/subscriptions";

export const metadata = pageMetadata({
  title: "Тарифы",
  description: "Free, Plus 299 ₽ и Pro 799 ₽ на RentProof. Оплата подключается отдельно.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем тарифы…</p>}>
        <Body />
      </Suspense>
    </PageShell>
  );
}

async function Body() {
  const user = await getCurrentUser();
  const current = user ? readPlan(user.id) : null;
  const billing = billingStatus();
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold text-navy">Тарифы</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Утверждённые цены: Free — 0 ₽, Plus — 299 ₽/мес, Pro — 799 ₽/мес. Лимиты задаются серверной конфигурацией.
          {billing.chargesEnabled
            ? " Тестовая оплата включена владельцем."
            : " Приём платежей сейчас выключен — платный тариф не активируется из интерфейса и не помечается как оплаченный."}
        </p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <li
            key={plan.id}
            id={plan.id}
            className={`flex flex-col rounded-3xl border p-6 ${"featured" in plan && plan.featured ? "border-navy bg-navy text-white" : "border-line bg-white"}`}
          >
            <p className="text-sm font-semibold opacity-80">{plan.audience}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">{plan.name}</h2>
            <p className="mt-4 font-display text-4xl font-semibold">{formatRubles(plan.price)}</p>
            <p className="text-sm opacity-75">{plan.period}</p>
            <ul className="mt-6 space-y-2 text-sm leading-6">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
              <li>Объявлений: {planListingLimit(plan.id)}</li>
              <li>Клиентов: {planCustomerLimit(plan.id)}</li>
              <li>ИИ-отчётов: {planAiLimit(plan.id)}</li>
              <li>История: {planHistoryLimit(plan.id)}</li>
            </ul>
            <div className="mt-8">
              {!user ? (
                <Link href="/register" className={"featured" in plan && plan.featured ? secondaryButton : primaryButton}>
                  Создать аккаунт
                </Link>
              ) : current === plan.id ? (
                <button className={"featured" in plan && plan.featured ? secondaryButton : primaryButton} type="button" disabled>
                  Текущий план
                </button>
              ) : plan.id === "free" ? (
                <Link href="/account/subscription" className={primaryButton}>
                  Управление подпиской
                </Link>
              ) : billing.chargesEnabled ? (
                <Link href="/account/subscription" className={"featured" in plan && plan.featured ? secondaryButton : primaryButton}>
                  Перейти к оплате
                </Link>
              ) : (
                <p className="text-sm opacity-80">Оплата ещё не подключена владельцем сервиса.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Подробнее:{" "}
        <Link href="/documents/subscription-terms" className="font-semibold text-navy">
          условия платных подписок
        </Link>
        .
      </p>
    </div>
  );
}
