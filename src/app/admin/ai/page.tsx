import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccAiCenter } from "@/lib/dcc";

export default function AdminAiPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">AI…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("ai.view");
  const data = dccAiCenter();
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">AI Control Center</h1>
      <p className="text-sm text-muted">Секретный ключ не отображается. Бюджет ориентир ≈ {data.budgetRubHint} ₽/мес.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Модель" value={data.model} />
        <Tile label="Host" value={data.baseUrlHost} />
        <Tile label="Ключ" value={data.keyConfigured ? "configured" : "missing"} />
        <Tile label="Запросов всего" value={String(data.totals.all)} />
        <Tile label="За сутки" value={String(data.totals.day)} />
        <Tile label="За месяц" value={String(data.totals.month)} />
        <Tile label="Активные пользователи ИИ" value={String(data.totals.activeUsers)} />
        <Tile label="Ошибки" value={String(data.totals.errors)} />
      </div>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Лимиты по тарифам</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>FREE: {data.limits.free}</li>
          <li>PLUS: {data.limits.plus}</li>
          <li>PRO: {data.limits.pro}</li>
        </ul>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {data.byPlan.map((row) => (
            <li key={row.plan}>
              {row.plan}: {row.reports} отчётов
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}
