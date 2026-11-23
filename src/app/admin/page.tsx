import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { OwnerBadge, OwnerHighlight } from "@/components/owner-badge";
import { requireStaff } from "@/lib/current-user";
import { dccDashboard, dccFinance } from "@/lib/dcc";
import { formatKopecks } from "@/lib/money";
import { roleLabel } from "@/lib/rbac";
import { ownerAssignedAt } from "@/lib/user-badges";
import { formatDateRu } from "@/lib/format";
import { listRecentAudit } from "@/lib/audit";

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
  const finance = dccFinance();
  const ownerSince = staff.staffRole === "owner" ? ownerAssignedAt(staff.id) : null;
  const ownerAudit =
    staff.staffRole === "owner"
      ? listRecentAudit(80).filter((entry) => entry.actorId === staff.id).slice(0, 8)
      : [];

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Dashboard · {roleLabel(staff.staffRole)}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold text-navy">
          RentProof Control Center
          {staff.staffRole === "owner" ? <OwnerBadge /> : null}
        </h1>
      </div>

      {staff.staffRole === "owner" ? (
        <section className="rounded-3xl border border-[#c41e3a]/35 bg-[#c41e3a]/5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <OwnerBadge />
            <h2 className="font-display text-xl font-semibold text-[#8b1228]">Профиль владельца</h2>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Имя</dt>
              <dd className="font-semibold text-navy">{staff.displayName}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="font-semibold text-navy">{staff.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Статус</dt>
              <dd>
                <OwnerHighlight>OWNER · active</OwnerHighlight>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Назначен владельцем</dt>
              <dd className="font-semibold text-navy">{ownerSince ? formatDateRu(ownerSince) : "—"}</dd>
            </div>
          </dl>
          {ownerAudit.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8b1228]">Последние действия OWNER</p>
              <ul className="mt-2 space-y-1 text-sm text-ink/80">
                {ownerAudit.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-medium text-[#c41e3a]">{entry.action}</span> · {formatDateRu(entry.createdAt)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link className="rounded-xl bg-[#c41e3a] px-3 py-2 font-semibold text-white" href={`/admin/users/${staff.id}`}>
              Моя карточка / подписка
            </Link>
            <Link className="rounded-xl border border-[#c41e3a]/40 bg-white px-3 py-2 font-semibold text-[#8b1228]" href="/admin/subscriptions">
              Подписки
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Пользователи" value={data.users.total} hint={`сегодня +${data.users.today}`} />
        <Stat label="За неделю / месяц" value={`${data.users.week} / ${data.users.month}`} />
        <Stat label="Активные / блок" value={`${data.users.active} / ${data.users.blocked}`} />
        <Stat label="Сотрудники" value={data.users.staff} />
        <Stat label="Активные PLUS" value={data.subscriptionsPlus} />
        <Stat label="Активные PRO" value={data.subscriptionsPro} />
        <Stat label="Успешные платежи" value={data.paymentsSucceeded} />
        <Stat label="Доход за 30 дн." value={formatKopecks(data.revenueMonthKopecks)} />
        <Stat label="Объявления" value={data.listings.total} hint={`pub ${data.listings.published}`} />
        <Stat label="Черновики / pending" value={`${data.listings.drafts} / ${data.listings.pending}`} />
        <Stat label="Жалобы open" value={data.complaintsOpen} />
        <Stat label="ИИ за сутки / месяц" value={`${data.ai.day} / ${data.ai.month}`} />
        <Stat label="Ошибки ИИ" value={data.ai.errors} />
        <Stat label="Почта" value={data.health.email} />
        <Stat label="Payments" value={data.health.payments} />
        <Stat label="AI key" value={data.health.aiConfigured ? "configured" : "missing"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Статус систем">
          <ul className="space-y-2 text-sm">
            <li>Database: {data.health.database}</li>
            <li>Email: {data.health.email}</li>
            <li>Backend / Frontend: {data.health.backend} / {data.health.frontend}</li>
            <li>Payments: {data.health.payments}</li>
            <li>AI key: {data.health.aiConfigured ? "configured" : "missing"}</li>
            <li className="text-muted">{finance.note}</li>
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
        <Link className="rounded-xl border border-line bg-white px-4 py-2 font-semibold" href="/admin/finance">
          Finance
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

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold text-navy">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MiniChart({ title, points }: { title: string; points: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-4 flex h-24 items-end gap-1">
        {points.map((point) => (
          <div
            key={point.day}
            title={`${point.day}: ${point.count}`}
            className="w-full rounded-t-md bg-navy/80"
            style={{ height: `${Math.max(4, (point.count / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
