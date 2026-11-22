import { Suspense } from "react";
import Link from "next/link";
import { PasswordForm } from "@/components/simple-forms";
import { secondaryButton } from "@/components/styles";
import { listAuditForActor } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { mailChannelStatus } from "@/lib/notifications";
import { billingStatus } from "@/lib/plans";
import { readPlan } from "@/lib/subscriptions";

export const metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем настройки…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const plan = readPlan(user.id);
  const billing = billingStatus();
  const mail = mailChannelStatus();
  const history = listAuditForActor(user.id, 15);
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Настройки</h1>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Тариф</h2>
        <p className="mt-2 text-sm text-muted">
          Сейчас: {plan.toUpperCase()}. Провайдер: {billing.provider} · режим {billing.mode}
          {billing.chargesEnabled ? (billing.fake ? " · fake-тест" : " · тест ЮKassa") : " · оплата не настроена"}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/account/subscription" className={secondaryButton}>Моя подписка</Link>
          <Link href="/pricing" className={secondaryButton}>Тарифы и оплата</Link>
          <Link href="/account/payments" className={secondaryButton}>История платежей</Link>
        </div>
      </section>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Почта</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{mail.note}</p>
      </section>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Пароль</h2>
        <div className="mt-4"><PasswordForm /></div>
      </section>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">История действий</h2>
        {history.length === 0 ? <p className="mt-3 text-sm text-muted">Записей пока нет.</p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {history.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span className="text-ink">{entry.action}</span>
              <span className="text-muted">{formatDateRu(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
