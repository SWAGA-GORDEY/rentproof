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
  const dark = staff.staffRole === "owner";

  return (
    <div className="grid gap-6">
      <div className={dark ? "animate-[fadeIn_0.4s_ease]" : undefined}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-[#ff6b81]" : "text-accent"}`}>
          Dashboard · {roleLabel(staff.staffRole)}
        </p>
        <h1
          className={`mt-1 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold ${
            dark ? "text-white" : "text-navy"
          }`}
        >
          {dark ? "Owner Control Center" : "RentProof Control Center"}
          {dark ? <OwnerBadge /> : null}
        </h1>
        <p className={`mt-2 text-sm ${dark ? "text-slate-400" : "text-muted"}`}>
          Входы: <code className="rounded bg-black/20 px-1">/owner</code>,{" "}
          <code className="rounded bg-black/20 px-1">/admin</code>,{" "}
          <code className="rounded bg-black/20 px-1">/control-center</code> — одна панель, одна серверная авторизация.
        </p>
      </div>

      {dark ? (
        <section className="rounded-3xl border border-[#c41e3a]/40 bg-[#c41e3a]/10 p-5 shadow-[0_0_40px_rgba(196,30,58,0.12)]">
          <div className="flex flex-wrap items-center gap-3">
            <OwnerBadge />
            <h2 className="font-display text-xl font-semibold text-[#ffb3bf]">Профиль владельца</h2>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Имя</dt>
              <dd className="font-semibold text-white">{staff.displayName}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd className="font-semibold text-white">{staff.email}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Статус</dt>
              <dd>
                <OwnerHighlight>OWNER · active</OwnerHighlight>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Назначен владельцем</dt>
              <dd className="font-semibold text-white">{ownerSince ? formatDateRu(ownerSince) : "—"}</dd>
            </div>
          </dl>
          {ownerAudit.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#ff6b81]">Последние действия OWNER</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {ownerAudit.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-medium text-[#ff6b81]">{entry.action}</span> · {formatDateRu(entry.createdAt)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link className="rounded-xl bg-[#c41e3a] px-3 py-2 font-semibold text-white" href={`/admin/users/${staff.id}`}>
              Моя карточка / подписка
            </Link>
            <Link
              className="rounded-xl border border-[#c41e3a]/40 bg-black/20 px-3 py-2 font-semibold text-[#ffb3bf]"
              href="/admin/subscriptions"
            >
              Подписки
            </Link>
            <Link
              className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 font-semibold text-slate-200"
              href="/admin/security"
            >
              Security
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat dark={dark} label="Пользователи" value={data.users.total} hint={`сегодня +${data.users.today}`} />
        <Stat dark={dark} label="За неделю / месяц" value={`${data.users.week} / ${data.users.month}`} />
        <Stat dark={dark} label="Активные / блок" value={`${data.users.active} / ${data.users.blocked}`} />
        <Stat dark={dark} label="Сотрудники" value={data.users.staff} />
        <Stat dark={dark} label="Активные PLUS" value={data.subscriptionsPlus} />
        <Stat dark={dark} label="Активные PRO" value={data.subscriptionsPro} />
        <Stat dark={dark} label="Успешные платежи" value={data.paymentsSucceeded} />
        <Stat dark={dark} label="Доход за 30 дн." value={formatKopecks(data.revenueMonthKopecks)} />
        <Stat dark={dark} label="Объявления" value={data.listings.total} hint={`pub ${data.listings.published}`} />
        <Stat dark={dark} label="Черновики / pending" value={`${data.listings.drafts} / ${data.listings.pending}`} />
        <Stat dark={dark} label="Жалобы open" value={data.complaintsOpen} />
        <Stat dark={dark} label="ИИ за сутки / месяц" value={`${data.ai.day} / ${data.ai.month}`} />
        <Stat dark={dark} label="Ошибки ИИ" value={data.ai.errors} />
        <Stat dark={dark} label="Почта" value={data.health.email} />
        <Stat dark={dark} label="Payments" value={data.health.payments} />
        <Stat dark={dark} label="Неудачные входы / сутки" value={data.loginFailuresDay} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card dark={dark} title="Статус систем">
          <ul className={`space-y-2 text-sm ${dark ? "text-slate-300" : ""}`}>
            <li>Database: {data.health.database}</li>
            <li>Email: {data.health.email}</li>
            <li>Backend / Frontend: {data.health.backend} / {data.health.frontend}</li>
            <li>Payments: {data.health.payments}</li>
            <li>AI key: {data.health.aiConfigured ? "configured" : "missing"}</li>
            <li className={dark ? "text-slate-500" : "text-muted"}>{finance.note}</li>
          </ul>
        </Card>
        <Card dark={dark} title="Распределение тарифов">
          <PlanBars dark={dark} plans={data.planDistribution} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <MiniChart dark={dark} title="Регистрации (14 дн.)" points={data.charts.registrationsByDay} />
        <MiniChart dark={dark} title="Доход ₽ (14 дн.)" points={data.charts.revenueByDay} money />
        <MiniChart dark={dark} title="Активность входов" points={data.charts.activeUsersByDay} />
        <MiniChart dark={dark} title="ИИ (14 дн.)" points={data.charts.aiByDay} />
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          className={`rounded-xl px-4 py-2 font-semibold ${dark ? "bg-[#c41e3a] text-white" : "bg-navy text-white"}`}
          href="/admin/users"
        >
          Users
        </Link>
        <Link
          className={`rounded-xl border px-4 py-2 font-semibold ${
            dark ? "border-white/15 text-slate-100" : "border-line bg-white"
          }`}
          href="/admin/subscriptions"
        >
          Subscriptions
        </Link>
        <Link
          className={`rounded-xl border px-4 py-2 font-semibold ${
            dark ? "border-white/15 text-slate-100" : "border-line bg-white"
          }`}
          href="/admin/finance"
        >
          Finance
        </Link>
        <Link
          className={`rounded-xl border px-4 py-2 font-semibold ${
            dark ? "border-white/15 text-slate-100" : "border-line bg-white"
          }`}
          href="/admin/email"
        >
          Email
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  dark,
}: {
  label: string;
  value: string | number;
  hint?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 transition duration-300 ${
        dark
          ? "border-white/10 bg-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:border-[#c41e3a]/40"
          : "border-line bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-slate-400" : "text-muted"}`}>
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-semibold ${dark ? "text-white" : "text-navy"}`}>{value}</p>
      {hint ? <p className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-muted"}`}>{hint}</p> : null}
    </div>
  );
}

function Card({ title, children, dark }: { title: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${dark ? "border-white/10 bg-white/5" : "border-line bg-white"}`}>
      <h2 className={`font-display text-xl font-semibold ${dark ? "text-white" : "text-navy"}`}>{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MiniChart({
  title,
  points,
  dark,
  money,
}: {
  title: string;
  points: Array<{ day: string; count: number }>;
  dark?: boolean;
  money?: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className={`rounded-3xl border p-5 ${dark ? "border-white/10 bg-white/5" : "border-line bg-white"}`}>
      <h2 className={`font-display text-lg font-semibold ${dark ? "text-white" : "text-navy"}`}>{title}</h2>
      <div className="mt-4 flex h-24 items-end gap-1">
        {points.map((point) => (
          <div
            key={point.day}
            title={`${point.day}: ${money ? formatKopecks(point.count) : point.count}`}
            className={`w-full rounded-t-md ${dark ? "bg-[#c41e3a]/80" : "bg-navy/80"}`}
            style={{ height: `${Math.max(4, (point.count / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function PlanBars({
  plans,
  dark,
}: {
  plans: Array<{ id: string; name: string; price: number; users: number }>;
  dark?: boolean;
}) {
  const max = Math.max(1, ...plans.map((p) => p.users));
  return (
    <ul className="space-y-3 text-sm">
      {plans.map((plan) => (
        <li key={plan.id}>
          <div className={`mb-1 flex justify-between ${dark ? "text-slate-300" : ""}`}>
            <span>
              {plan.name} · {plan.price} ₽
            </span>
            <span className={`font-semibold ${dark ? "text-white" : "text-navy"}`}>{plan.users}</span>
          </div>
          <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-mist"}`}>
            <div
              className={`h-full rounded-full ${dark ? "bg-[#ff6b81]" : "bg-navy"}`}
              style={{ width: `${Math.max(4, (plan.users / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
