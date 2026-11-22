import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccFinance } from "@/lib/dcc";

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
      <h1 className="font-display text-3xl font-semibold text-navy">Finance</h1>
      <p className="text-sm text-muted">{data.note}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="FREE" value={String(data.free)} />
        <Tile label="PLUS" value={String(data.plus)} />
        <Tile label="PRO" value={String(data.pro)} />
        <Tile label="Потенциал ₽/мес" value={String(data.potentialMonthly)} />
        <Tile label="Успешные транзакции" value={String(data.paidTransactions)} />
        <Tile
          label="Платёжный статус"
          value={data.billing.chargesEnabled ? `${data.billing.provider}/${data.billing.mode}` : "OFF"}
        />
      </div>
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
