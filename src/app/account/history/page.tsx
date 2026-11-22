import { Suspense } from "react";
import { listAuditForActor } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { planHistoryLimit } from "@/lib/plans";
import { readPlan } from "@/lib/subscriptions";

export const metadata = { title: "История операций" };

export default function HistoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем историю…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const plan = readPlan(user.id);
  const limit = planHistoryLimit(plan);
  const history = listAuditForActor(user.id, limit);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">История операций</h1>
        <p className="mt-2 text-sm text-muted">Показываем до {limit} последних событий по вашему тарифу.</p>
      </div>
      <ul className="rounded-3xl border border-line bg-white p-5">
        {history.length === 0 ? <li className="text-sm text-muted">Записей пока нет.</li> : null}
        {history.map((entry) => (
          <li key={entry.id} className="flex justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
            <span className="text-ink">{entry.action}</span>
            <span className="shrink-0 text-muted">{formatDateRu(entry.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}