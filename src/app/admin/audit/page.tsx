import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { listRecentAudit } from "@/lib/audit";
import { formatDateRu } from "@/lib/format";
import { getDb } from "@/lib/db";

export default function AdminAuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Audit…</p>}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("logs.view");
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  let rows = listRecentAudit(200);
  if (query) {
    rows = rows.filter(
      (row) =>
        row.action.toLowerCase().includes(query) ||
        (row.entityId ?? "").toLowerCase().includes(query) ||
        (row.actorId ?? "").toLowerCase().includes(query),
    );
  }

  const actors = new Map<string, string>();
  for (const row of rows) {
    if (row.actorId && !actors.has(row.actorId)) {
      const u = getDb()
        .prepare(`SELECT name, display_name, staff_role FROM users WHERE id = ?`)
        .get(row.actorId) as { name: string; display_name: string | null; staff_role: string | null } | undefined;
      actors.set(row.actorId, `${u?.display_name || u?.name || "user"}${u?.staff_role ? ` · ${u.staff_role}` : ""}`);
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Audit Log</h1>
      <p className="text-sm text-muted">Журнал только для чтения. Удаление через админку недоступно.</p>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="действие / id" className="rounded-xl border border-line px-3 py-2 text-sm" />
        <button className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white" type="submit">
          Фильтр
        </button>
      </form>
      <ul className="rounded-3xl border border-line bg-white p-5 text-sm">
        {rows.map((row) => {
          const isOwnerAction = row.action.startsWith("owner.") || (actors.get(row.actorId ?? "") ?? "").includes("owner");
          return (
            <li key={row.id} className="grid gap-1 border-b border-line py-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className={`font-semibold ${isOwnerAction ? "text-[#c41e3a]" : "text-navy"}`}>
                  {isOwnerAction ? "♛ " : ""}
                  {row.action}
                </p>
                <p className="text-xs text-muted">
                  {row.actorId ? actors.get(row.actorId) : "system"} · {row.entityType}/{row.entityId ?? "—"}
                </p>
              </div>
              <p className="text-muted">{formatDateRu(row.createdAt)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
