import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccDashboard } from "@/lib/dcc";

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Analytics…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("analytics.view");
  const data = dccDashboard();
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Analytics</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Chart title="Регистрации" points={data.charts.registrationsByDay} />
        <Chart title="Объявления" points={data.charts.listingsByDay} />
        <Chart title="ИИ" points={data.charts.aiByDay} />
      </div>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Тарифы</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.planDistribution.map((plan) => (
            <li key={plan.id}>
              {plan.name}: {plan.users}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Chart({ title, points }: { title: string; points: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      <div className="mt-4 flex h-32 items-end gap-1">
        {points.map((point) => (
          <div key={point.day} className="flex flex-1 flex-col justify-end" title={`${point.day}: ${point.count}`}>
            <div className="w-full rounded-t bg-accent/80" style={{ height: `${Math.max(4, (point.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}
