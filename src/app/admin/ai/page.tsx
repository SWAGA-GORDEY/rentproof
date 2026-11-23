import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccAiCenter } from "@/lib/dcc";
import { formatDateRu } from "@/lib/format";

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
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">AI Control Center</h1>
        <p className="mt-2 text-sm text-muted">
          Ключ API не отображается. Расход в ₽ из провайдера не подключён — только счётчики запросов из БД.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Модель" value={data.model} />
        <Tile label="Host" value={data.baseUrlHost} />
        <Tile label="Ключ" value={data.keyConfigured ? "configured" : "missing"} />
        <Tile label="Доступность" value={data.availability} />
        <Tile label="Запросов всего" value={String(data.totals.all)} />
        <Tile label="За сутки" value={String(data.totals.day)} />
        <Tile label="За месяц" value={String(data.totals.month)} />
        <Tile label="Успешные / месяц" value={String(data.totals.succeededMonth)} />
        <Tile label="Активные пользователи ИИ" value={String(data.totals.activeUsers)} />
        <Tile label="Ошибки (всего)" value={String(data.totals.errors)} />
      </div>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Лимиты по тарифам (env)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>FREE: {data.limits.free}</li>
          <li>PLUS: {data.limits.plus}</li>
          <li>PRO: {data.limits.pro}</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Выключение: <code>RENTPROOF_AI_ENABLED=0</code>. Лимиты меняются через RENTPROOF_PLAN_*_AI без фиктивных цифр.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {data.byPlan.map((row) => (
            <li key={row.plan}>
              {row.plan}: {row.reports} отчётов
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Журнал ошибок ИИ</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.recentErrors.map((row) => (
            <li key={row.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span>
                {row.status} · user {row.user_id}
              </span>
              <span className="text-muted">{formatDateRu(row.created_at)}</span>
            </li>
          ))}
          {data.recentErrors.length === 0 ? <li className="text-muted">Ошибок в журнале нет.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 break-all font-display text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}
