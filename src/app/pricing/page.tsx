import { Suspense } from "react";
import Link from "next/link";
import { startSubscriptionCheckoutAction } from "@/app/actions/payments";
import { PageShell } from "@/components/page-shell";
import { primaryButton, secondaryButton } from "@/components/styles";
import { getCurrentUser } from "@/lib/current-user";
import { formatRubles } from "@/lib/format";
import { billingStatus, planAiLimit, planHistoryLimit, planListingLimit, plans } from "@/lib/plans";
import { pageMetadata } from "@/lib/seo";
import { readPlan } from "@/lib/subscriptions";

export const metadata = pageMetadata({
  title: "Тарифы",
  description: "Free, Plus и Pro на RentProof. Оплата Plus/Pro через ЮKassa в тестовом режиме.",
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
          Free без оплаты. Plus и Pro оформляются через ЮKassa в режиме{" "}
          <strong className="font-semibold text-ink">{billing.mode}</strong>
          {billing.chargesEnabled
            ? billing.fake
              ? " (локальный fake-провайдер, без сети)."
              : " (тестовый магазин)."
            : ". Платёжный провайдер ещё не настроен — оплата недоступна."}
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
              <li>Отчётов AI: {planAiLimit(plan.id)}</li>
              <li>Записей истории: {planHistoryLimit(plan.id)}</li>
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
              ) : plan.id === "free" || billing.chargesEnabled ? (
                <form action={startSubscriptionCheckoutAction}>
                  <input type="hidden" name="plan" value={plan.id} />
                  <button className={"featured" in plan && plan.featured ? secondaryButton : primaryButton} type="submit">
                    {plan.id === "free" ? "Перейти на Free" : "Оплатить (тест)"}
                  </button>
                </form>
              ) : (
                <p className="text-sm opacity-80">Нужны тестовые ключи ЮKassa в Render.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
