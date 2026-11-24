import { Suspense } from "react";
import { requireStaff } from "@/lib/current-user";
import { dccEmailCenter } from "@/lib/dcc";
import { formatDateRu } from "@/lib/format";

export default function AdminEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Email…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("settings.view");
  const data = dccEmailCenter();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Email Center</h1>
        <p className="mt-2 text-sm text-muted">{data.note}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Драйвер (env)" value={data.driverEnv} />
        <Tile label="Активный канал" value={data.active} />
        <Tile label="Resend key" value={data.resendKeyPresent ? "present" : "missing"} />
        <Tile label="SMTP host" value={data.smtpHostPresent ? "present" : "missing"} />
        <Tile label="mailConfigured()" value={data.configured ? "yes" : "no"} />
        <Tile label="From" value={data.fromAddress} />
        <Tile label="Доставлено / 7д" value={String(data.week.delivered)} />
        <Tile label="Не доставлено / 7д" value={String(data.week.failedOrConsole)} />
        <Tile label="Email audit / 7д" value={String(data.week.verificationAndEmailAudit)} />
        <Tile label="Password audit / 7д" value={String(data.week.passwordRelatedAudit)} />
      </div>
      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Последние попытки отправки</h2>
        <p className="mt-1 text-xs text-muted">Только домен получателя и тема — без адресов и кодов.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {data.recentDeliveries.length === 0 ? (
            <li className="text-muted">Записей пока нет.</li>
          ) : (
            data.recentDeliveries.map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
                <span>
                  {row.delivered ? "ok" : "fail"} · {row.adapter} · @{row.recipientDomain} · {row.subject}
                  {row.errorCode ? ` · ${row.errorCode}` : ""}
                </span>
                <span className="text-muted">{formatDateRu(row.createdAt)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="rounded-3xl border border-line bg-white p-5 text-sm text-muted">
        <p>
          API-ключи не отображаются. Тестовая отправка на произвольный адрес из UI не добавлена намеренно —
          используйте существующие потоки verify-email / forgot-password на разрешённом аккаунте.
        </p>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-2 break-all font-display text-xl font-semibold text-navy">{value}</p>
    </div>
  );
}
