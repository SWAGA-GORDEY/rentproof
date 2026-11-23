import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccSecurityCenter } from "@/lib/dcc";
import { formatDateRu } from "@/lib/format";

export default function AdminSecurityPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Security…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("logs.view");
  const data = dccSecurityCenter();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Security Center</h1>
        <p className="mt-2 text-sm text-muted">Журналы OWNER/ADMIN, баны, роли и неудачные входы — только реальные записи.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Неудачные входы (сутки)" value={String(data.loginFailuresDay)} />
        <Tile label="Неудачные входы (неделя)" value={String(data.loginFailuresWeek)} />
        <Tile label="Активные блокировки" value={String(data.activeBans)} />
      </div>
      <Section title="Действия OWNER">
        <LogList
          rows={data.ownerActions.map((row) => ({
            id: row.id,
            text: `${row.action} · ${row.actor_email ?? "—"} · ${row.entity_type}/${row.entity_id ?? "—"}`,
            at: row.created_at,
          }))}
        />
      </Section>
      <Section title="Действия ADMIN / STAFF">
        <LogList
          rows={data.adminActions.map((row) => ({
            id: row.id,
            text: `${row.action} · ${row.actor_email ?? "—"} · ${row.entity_type}/${row.entity_id ?? "—"}`,
            at: row.created_at,
          }))}
        />
      </Section>
      <Section title="История блокировок">
        <LogList
          rows={data.recentBans.map((row) => ({
            id: row.id,
            text: `${row.kind} · user ${row.user_id} · ${row.reason}${row.lifted_at ? " · снята" : " · активна"}`,
            at: row.created_at,
          }))}
        />
      </Section>
      <Section title="Изменения ролей">
        <LogList
          rows={data.roleChanges.map((row) => ({
            id: row.id,
            text: `${row.action} · ${row.entity_id ?? "—"}`,
            at: row.created_at,
          }))}
        />
      </Section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold text-navy">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LogList({ rows }: { rows: Array<{ id: string; text: string; at: string }> }) {
  if (!rows.length) return <p className="text-sm text-muted">Пока пусто.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((row) => (
        <li key={row.id} className="flex justify-between gap-3 border-b border-line py-2">
          <span>{row.text}</span>
          <span className="shrink-0 text-muted">{formatDateRu(row.at)}</span>
        </li>
      ))}
    </ul>
  );
}
