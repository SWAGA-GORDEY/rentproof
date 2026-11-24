import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { formatDateRu } from "@/lib/format";

export default function AdminReferralsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Рефералы…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("users.view");
  const codes = getDb()
    .prepare(
      `SELECT c.code, c.created_at, u.email,
              (SELECT COUNT(*) FROM referral_attributions a WHERE a.referral_code_id = c.id) AS invited
       FROM referral_codes c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC LIMIT 100`,
    )
    .all() as Array<{ code: string; created_at: string; email: string; invited: number | string }>;

  const recent = getDb()
    .prepare(
      `SELECT a.created_at, referrer.email AS referrer_email, referred.email AS referred_email
       FROM referral_attributions a
       JOIN users referrer ON referrer.id = a.referrer_id
       JOIN users referred ON referred.id = a.referred_user_id
       ORDER BY a.created_at DESC LIMIT 50`,
    )
    .all() as Array<{ created_at: string; referrer_email: string; referred_email: string }>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Referrals</h1>
        <p className="mt-2 text-sm text-muted">
          Учёт приглашений. Автоматические денежные бонусы не начисляются.
        </p>
      </div>
      <section className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Код</th>
              <th className="px-4 py-3">Владелец</th>
              <th className="px-4 py-3">Приглашено</th>
              <th className="px-4 py-3">Создан</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-muted">
                  Кодов пока нет.
                </td>
              </tr>
            ) : (
              codes.map((row) => (
                <tr key={row.code} className="border-b border-line/70">
                  <td className="px-4 py-3 font-mono">{row.code}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{Number(row.invited)}</td>
                  <td className="px-4 py-3 text-muted">{formatDateRu(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-3xl border border-line bg-white">
        <h2 className="border-b border-line px-4 py-3 font-display text-xl font-semibold text-navy">Последние атрибуции</h2>
        <ul className="divide-y divide-line text-sm">
          {recent.length === 0 ? (
            <li className="px-4 py-6 text-muted">Записей нет.</li>
          ) : (
            recent.map((row, index) => (
              <li key={`${row.referred_email}-${index}`} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <span>
                  {row.referrer_email} → {row.referred_email}
                </span>
                <span className="text-muted">{formatDateRu(row.created_at)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
