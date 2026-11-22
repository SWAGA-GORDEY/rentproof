import { Suspense } from "react";
import Link from "next/link";
import { cancelRenewalAction } from "@/app/actions/payments";
import { primaryButton, secondaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { billingStatus, plans } from "@/lib/plans";
import { currentSubscription } from "@/lib/payments";
import { readPlan } from "@/lib/subscriptions";

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
  const billing = billingStatus();
  const planMeta = plans.find((item) => item.id === plan);
  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Моя подписка</h1>
        <p className="mt-2 text-sm text-muted">
          Провайдер: {billing.provider} · режим {billing.mode}
          {billing.fake ? " · fake" : ""}. Автопродление выключено.
        </p>
      </div>
      <div className="rounded-3xl border border-line bg-white p-6">
        <p className="text-xs font-semibold uppercase text-accent">Текущий тариф</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-navy">{planMeta?.name ?? plan}</h2>
        {sub ? (
          <ul className="mt-4 space-y-1 text-sm text-muted">
            <li>Статус: {sub.status}</li>
            <li>Режим записи: {sub.mode}</li>
            <li>Продление: {sub.renewalStatus === "off" ? "отключено" : sub.renewalStatus}</li>
            <li>Действует до: {sub.expiresAt ? formatDateRu(sub.expiresAt) : "бессрочно (Free / демо)"}</li>
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">История подписок пока пуста — действует план из профиля.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className={primaryButton}>Сменить тариф</Link>
          <Link href="/account/payments" className={secondaryButton}>Платежи</Link>
          <form action={cancelRenewalAction}>
            <button className={secondaryButton} type="submit">Отключить продление</button>
          </form>
        </div>
      </div>
    </div>
  );
}
