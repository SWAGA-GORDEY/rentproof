import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccFinance } from "@/lib/dcc";
import { formatKopecks } from "@/lib/money";

export default function AdminFinancePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Finance…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("finance.view");
  const data = dccFinance();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Finance</h1>
        <p className="mt-2 text-sm text-muted">{data.note}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="FREE users" value={String(data.free)} />
        <Tile label="PLUS users" value={String(data.plus)} hint={`paid: ${data.plusPaid}`} />
        <Tile label="PRO users" value={String(data.pro)} hint={`paid: ${data.proPaid}`} />
        <Tile label="Потенциал paid ₽/мес" value={String(data.potentialMonthly)} />
        <Tile label="Успешные платежи" value={String(data.paidTransactions)} />
        <Tile label="Неуспешные" value={String(data.failedTransactions)} />
        <Tile label="Возвраты (ok)" value={String(data.refundsSucceeded)} />
        <Tile
          label="Платёжный статус"
          value={data.billing.chargesEnabled ? `${data.billing.provider}/${data.billing.mode}` : "OFF"}
        />
        <Tile label="Доход сегодня" value={formatKopecks(data.revenueKopecks.today)} />
        <Tile label="Доход неделя" value={formatKopecks(data.revenueKopecks.week)} />
        <Tile label="Доход 30 дн." value={formatKopecks(data.revenueKopecks.month)} />
        <Tile label="Доход всё время" value={formatKopecks(data.revenueKopecks.allTime)} />
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
