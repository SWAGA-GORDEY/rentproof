import { Suspense } from "react";
import Link from "next/link";
import { selectPlanAction } from "@/app/actions/social";
import { PageShell } from "@/components/page-shell";
import { primaryButton, secondaryButton } from "@/components/styles";
import { getCurrentUser } from "@/lib/current-user";
import { formatRubles } from "@/lib/format";
import { billingStatus, planAiLimit, planHistoryLimit, planListingLimit, plans } from "@/lib/plans";
import { readPlan } from "@/lib/subscriptions";

export const metadata = {
  title: "Тарифы — RentProof",
  description: "Сравнение Free, Plus и Pro. Оплата не подключена, деньги не списываются.",
};

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
          Все три плана работают в демонстрационном режиме. Провайдер «{billing.provider}» не настроен, списания выключены.
        </p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <li key={plan.id} id={plan.id} className={`flex flex-col rounded-3xl border p-6 ${"featured" in plan && plan.featured ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>
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
              {user ? (
                <form action={selectPlanAction}>
                  <input type="hidden" name="plan" value={plan.id} />
                  <button className={"featured" in plan && plan.featured ? secondaryButton : primaryButton} type="submit" disabled={current === plan.id}>
                    {current === plan.id ? "Текущий план" : "Включить демонстрацию"}
                  </button>
                </form>
              ) : (
                <Link href="/register" className={"featured" in plan && plan.featured ? secondaryButton : primaryButton}>Создать аккаунт</Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
