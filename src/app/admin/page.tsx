import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/current-user";
import { dccDashboard } from "@/lib/dcc";
import { roleLabel } from "@/lib/rbac";

export default function AdminHomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Считаем статистику…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const { staff } = await requireStaff();
  const data = dccDashboard();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Dashboard · {roleLabel(staff.staffRole)}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy">RentProof Control Center</h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Пользователи" value={data.users.total} hint={`сегодня +${data.users.today}`} />
        <Stat label="За неделю / месяц" value={`${data.users.week} / ${data.users.month}`} />
        <Stat label="Активные / блок" value={`${data.users.active} / ${data.users.blocked}`} />
        <Stat label="Сотрудники" value={data.users.staff} />
        <Stat label="Объявления" value={data.listings.total} hint={`pub ${data.listings.published}`} />
        <Stat label="Черновики / pending" value={`${data.listings.drafts} / ${data.listings.pending}`} />
        <Stat label="Жалобы open" value={data.complaintsOpen} />
        <Stat label="Активные платные подписки" value={data.subscriptionsActive} />
        <Stat label="ИИ за сутки / месяц" value={`${data.ai.day} / ${data.ai.month}`} />
        <Stat label="Ошибки ИИ" value={data.ai.errors} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Статус систем">
          <ul className="space-y-2 text-sm">
            <li>Database: {data.health.database}</li>
            <li>Email: {data.health.email}</li>
            <li>Backend / Frontend: {data.health.backend} / {data.health.frontend}</li>
            <li>Payments: {data.health.payments}</li>
            <li>AI key: {data.health.aiConfigured ? "configured" : "missing"}</li>
          </ul>
        </Card>
        <Card title="Тарифы">
          <ul className="space-y-2 text-sm">
            {data.planDistribution.map((plan) => (
              <li key={plan.id} className="flex justify-between gap-3">
                <span>
                  {plan.name} · {plan.price} ₽
                </span>
                <span className="font-semibold text-navy">{plan.users}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MiniChart title="Регистрации (14 дн.)" points={data.charts.registrationsByDay} />
        <MiniChart title="Объявления (14 дн.)" points={data.charts.listingsByDay} />
        <MiniChart title="ИИ (14 дн.)" points={data.charts.aiByDay} />
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="rounded-xl bg-navy px-4 py-2 font-semibold text-white" href="/admin/users">
          Users
        </Link>
        <Link className="rounded-xl border border-line bg-white px-4 py-2 font-semibold" href="/admin/subscriptions">
          Subscriptions
        </Link>
        <Link className="rounded-xl border border-line bg-white px-4 py-2 font-semibold" href="/admin/staff">
          Staff
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniChart({ title, points }: { title: string; points: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-4 flex h-28 items-end gap-1">
        {points.map((point) => (
          <div key={point.day} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t-md bg-navy/80"
              style={{ height: `${Math.max(4, (point.count / max) * 100)}%` }}
              title={`${point.day}: ${point.count}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
