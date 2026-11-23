import { Suspense } from "react";
import Link from "next/link";
import { OwnerBadge } from "@/components/owner-badge";
import { UserBadgeList } from "@/components/user-badge-list";
import { requireStaff } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { formatDateRu } from "@/lib/format";
import { listUserBadges } from "@/lib/user-badges";

type Query = { q?: string; plan?: string; status?: string; page?: string };

export default function AdminUsersPage({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем пользователей…</p>}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Query> }) {
  await requireStaff("users.view");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const plan = params.plan ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = 30;
  const offset = (page - 1) * pageSize;

  let sql = `SELECT id, email, name, plan, staff_role, blocked_at, email_verified, created_at, last_login_at
             FROM users WHERE 1=1`;
  const args: Array<string | number> = [];
  if (q) {
    sql += ` AND (lower(email) LIKE ? OR lower(name) LIKE ? OR id LIKE ?)`;
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (plan === "free" || plan === "plus" || plan === "pro") {
    sql += ` AND plan = ?`;
    args.push(plan);
  }
  if (status === "blocked") sql += ` AND blocked_at IS NOT NULL`;
  if (status === "active") sql += ` AND blocked_at IS NULL`;
  if (status === "staff") sql += ` AND staff_role IS NOT NULL AND staff_role != ''`;

  const total = Number((getDb().prepare(`SELECT COUNT(*) AS c FROM (${sql}) t`).get(...args) as { c: number }).c);
  const pageSql = `${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const rows = getDb()
    .prepare(pageSql)
    .all(...args, pageSize, offset) as Array<{
    id: string;
    email: string;
    name: string;
    plan: string;
    staff_role: string | null;
    blocked_at: string | null;
    email_verified: number;
    created_at: string;
    last_login_at: string | null;
  }>;

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Users</h1>
      <form className="grid gap-3 rounded-3xl border border-line bg-white p-4 md:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="email / имя / id" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <select name="plan" defaultValue={plan} className="rounded-xl border border-line px-3 py-2 text-sm">
          <option value="">Все тарифы</option>
          <option value="free">FREE</option>
          <option value="plus">PLUS</option>
          <option value="pro">PRO</option>
        </select>
        <select name="status" defaultValue={status} className="rounded-xl border border-line px-3 py-2 text-sm">
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
          <option value="staff">Сотрудники</option>
        </select>
        <button className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white" type="submit">
          Найти
        </button>
      </form>
      <p className="text-sm text-muted">Найдено: {total}</p>
      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3">Имя</th>
              <th>Email</th>
              <th>Тариф</th>
              <th>Статус</th>
              <th>Регистрация</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badges = listUserBadges(row.id);
              return (
                <tr
                  key={row.id}
                  className={`border-t border-line ${row.staff_role === "owner" ? "bg-[#c41e3a]/5" : ""}`}
                >
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      {row.staff_role === "owner" ? <OwnerBadge compact /> : null}
                      <UserBadgeList badges={badges.filter((b) => b.kind !== "owner")} />
                    </div>
                  </td>
                  <td>{row.email}</td>
                  <td className="font-semibold uppercase text-navy">{row.plan}</td>
                  <td>
                    {row.blocked_at ? (
                      <span className="font-semibold text-red-700">blocked</span>
                    ) : (
                      "active"
                    )}
                    {row.email_verified ? "" : " · unverified"}
                  </td>
                  <td>{formatDateRu(row.created_at)}</td>
                  <td className="p-3">
                    <Link className="font-semibold text-navy underline" href={`/admin/users/${row.id}`}>
                      Открыть профиль
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 text-sm">
        {page > 1 ? (
          <Link href={`/admin/users?q=${encodeURIComponent(q)}&plan=${plan}&status=${status}&page=${page - 1}`}>←</Link>
        ) : null}
        <span>
          стр. {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        {page * pageSize < total ? (
          <Link href={`/admin/users?q=${encodeURIComponent(q)}&plan=${plan}&status=${status}&page=${page + 1}`}>→</Link>
        ) : null}
      </div>
    </div>
  );
}
