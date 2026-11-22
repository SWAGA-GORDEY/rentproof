import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccDashboard } from "@/lib/dcc";
import { listRecentAudit } from "@/lib/audit";
import { formatDateRu } from "@/lib/format";
import { getDb } from "@/lib/db";

export default function AdminMonitoringPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Monitoring…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("monitoring.view");
  const data = dccDashboard();
  const errors = listRecentAudit(100).filter((e) => e.action.includes("fail") || e.action.includes("error"));
  const aiErrors = getDb()
    .prepare(
      `SELECT id, status, created_at FROM ai_reports WHERE status IN ('unavailable','error') ORDER BY created_at DESC LIMIT 20`,
    )
    .all() as Array<{ id: string; status: string; created_at: string }>;

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">System Monitoring</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Backend" value={data.health.backend} />
        <Tile label="Database" value={data.health.database} />
        <Tile label="Email" value={data.health.email} />
        <Tile label="AI" value={data.health.aiConfigured ? "configured" : "missing key"} />
        <Tile label="Payments" value={data.health.payments} />
        <Tile label="Frontend" value={data.health.frontend} />
      </div>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Error Logs</h2>
        <p className="mt-1 text-xs text-muted">Без паролей, токенов и API-ключей.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {aiErrors.map((row) => (
            <li key={row.id}>
              AI {row.status} · {formatDateRu(row.created_at)}
            </li>
          ))}
          {errors.map((row) => (
            <li key={row.id}>
              {row.action} · {formatDateRu(row.createdAt)}
            </li>
          ))}
          {aiErrors.length === 0 && errors.length === 0 ? <li className="text-muted">Критических записей нет.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 font-display text-xl font-semibold text-navy">{value}</p>
    </div>
  );
}
