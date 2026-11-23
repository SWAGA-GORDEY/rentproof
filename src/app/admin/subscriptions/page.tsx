import { Suspense } from "react";
import Link from "next/link";
import { listAllSubscriptions } from "@/lib/admin-subscriptions";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";

type Query = { source?: string; status?: string; plan?: string };

export default function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Subscriptions…</p>}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Query> }) {
  await requireStaff("subscriptions.view");
  const params = await searchParams;
  const source = params.source ?? "";
  const status = params.status ?? "";
  const plan = params.plan ?? "";
  let rows = listAllSubscriptions(400);
  if (source) rows = rows.filter((row) => row.sourceKind === source);
  if (status) rows = rows.filter((row) => row.status === status);
  if (plan === "free" || plan === "plus" || plan === "pro") rows = rows.filter((row) => row.plan === plan);

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Subscriptions</h1>
      <p className="text-sm text-muted">
        FREE 0 ₽ · PLUS 299 ₽ · PRO 799 ₽. OWNER_GRANT / ADMIN_GRANTED не создают платёж. PAID — только реальные
        payments.
      </p>
      <form className="grid gap-3 rounded-3xl border border-line bg-white p-4 md:grid-cols-4">
        <select name="plan" defaultValue={plan} className="rounded-xl border border-line px-3 py-2 text-sm">
          <option value="">Все тарифы</option>
          <option value="free">FREE</option>
          <option value="plus">PLUS</option>
          <option value="pro">PRO</option>
        </select>
        <select name="status" defaultValue={status} className="rounded-xl border border-line px-3 py-2 text-sm">
          <option value="">Все статусы</option>
          <option value="active">active</option>
          <option value="revoked">revoked</option>
          <option value="expired">expired</option>
        </select>
        <select name="source" defaultValue={source} className="rounded-xl border border-line px-3 py-2 text-sm">
          <option value="">Все источники</option>
          <option value="paid">paid</option>
          <option value="owner_grant">owner_grant</option>
          <option value="admin_granted">admin_granted</option>
          <option value="promotional">promotional</option>
          <option value="referral">referral</option>
        </select>
        <button className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white" type="submit">
          Фильтр
        </button>
      </form>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-semibold text-navy">{row.name}</p>
            <p className="text-muted">{row.email}</p>
            <p className="mt-2">
              {row.plan} · {row.status} · {row.sourceKind}
            </p>
            <p className="text-xs text-muted">
              {row.startedAt ? formatDateRu(row.startedAt) : "—"} → {row.expiresAt ? formatDateRu(row.expiresAt) : "∞"}
            </p>
            <Link className="mt-2 inline-block font-semibold text-navy underline" href={`/admin/users/${row.userId}`}>
              Карточка
            </Link>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-3xl border border-line bg-white md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3">Пользователь</th>
              <th>Email</th>
              <th>Тариф</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Начало</th>
              <th>Конец</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="p-3">{row.name}</td>
                <td>{row.email}</td>
                <td>{row.plan}</td>
                <td>{row.sourceKind}</td>
                <td>{row.status}</td>
                <td>{row.startedAt ? formatDateRu(row.startedAt) : "—"}</td>
                <td>{row.expiresAt ? formatDateRu(row.expiresAt) : "∞"}</td>
                <td className="p-3">
                  <Link className="font-semibold text-navy underline" href={`/admin/users/${row.userId}`}>
                    Карточка
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
