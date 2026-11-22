import { Suspense } from "react";
import Link from "next/link";
import { listAllSubscriptions } from "@/lib/admin-subscriptions";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Subscriptions…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("subscriptions.view");
  const rows = listAllSubscriptions(300);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Subscriptions</h1>
      <p className="text-sm text-muted">
        FREE 0 ₽ · PLUS 299 ₽ · PRO 799 ₽. Платежи выключены. ADMIN_GRANTED ≠ PAID.
      </p>
      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
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
