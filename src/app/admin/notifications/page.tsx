import { Suspense } from "react";
import { dccMarkNotificationAction } from "@/app/actions/dcc";
import { secondaryButton } from "@/components/styles";
import { listAdminNotifications } from "@/lib/admin-notifications";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Notifications…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff();
  const items = listAdminNotifications(100);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-navy">Notifications</h1>
        <form action={dccMarkNotificationAction}>
          <input type="hidden" name="all" value="1" />
          <button type="submit" className={secondaryButton}>
            Отметить все прочитанными
          </button>
        </form>
      </div>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs uppercase text-accent">
              {item.kind}
              {item.read_at ? "" : " · NEW"}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-navy">{item.title}</p>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
            <p className="mt-2 text-xs text-muted">{formatDateRu(item.created_at)}</p>
            {!item.read_at ? (
              <form action={dccMarkNotificationAction} className="mt-3">
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="text-sm font-semibold text-navy underline">
                  Прочитано
                </button>
              </form>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="text-sm text-muted">Пока нет уведомлений.</li> : null}
      </ul>
    </div>
  );
}
