import { Suspense } from "react";
import Link from "next/link";
import { dccCreateTicketAction } from "@/app/actions/dcc";
import { fieldClass, primaryButton } from "@/components/styles";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { listTickets, TICKET_CATEGORIES } from "@/lib/support-tickets";
import { getDb } from "@/lib/db";

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Support…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("support.view");
  const tickets = listTickets(100);
  const recentUsers = getDb()
    .prepare(`SELECT id, email, name FROM users ORDER BY created_at DESC LIMIT 20`)
    .all() as Array<{ id: string; email: string; name: string }>;

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">CRM & Support</h1>

      <form action={dccCreateTicketAction} className="grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-2">
        <h2 className="font-display text-xl font-semibold text-navy md:col-span-2">Новое обращение</h2>
        <select name="userId" required className={fieldClass}>
          <option value="">Пользователь</option>
          {recentUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.email}
            </option>
          ))}
        </select>
        <select name="category" className={fieldClass}>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input name="subject" required placeholder="Тема" className={`${fieldClass} md:col-span-2`} />
        <textarea name="body" required rows={3} className={`${fieldClass} md:col-span-2`} placeholder="Описание" />
        <button type="submit" className={primaryButton}>
          Создать
        </button>
      </form>

      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3">Тема</th>
              <th>Пользователь</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Обновлено</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="p-3">
                  <Link className="font-semibold text-navy underline" href={`/admin/support/${t.id}`}>
                    {t.subject}
                  </Link>
                </td>
                <td>{t.name}</td>
                <td>{t.category}</td>
                <td>{t.status}</td>
                <td>{formatDateRu(t.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
