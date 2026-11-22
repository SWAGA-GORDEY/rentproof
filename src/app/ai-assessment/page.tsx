import { Suspense } from "react";
import Link from "next/link";
import { AiForm } from "@/components/simple-forms";
import { PageShell } from "@/components/page-shell";
import { listAiReports, publicAiStatus } from "@/lib/ai";
import { getCurrentUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { readPlan } from "@/lib/subscriptions";

export const metadata = {
  title: "Визуальная оценка",
  description: "Разбор загруженных фотографий. Это не техническая экспертиза.",
  robots: { index: false, follow: false },
};

export default function AiPage() {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем модуль…</p>}>
        <Body />
      </Suspense>
    </PageShell>
  );
}

async function Body() {
  const user = await getCurrentUser();
  const status = publicAiStatus();
  const reports = user ? listAiReports(user.id, readPlan(user.id)) : [];
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <h1 className="font-display text-4xl font-semibold text-navy">Визуальная оценка</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Модуль смотрит загруженные изображения на сервере через TokenLavka-совместимый API. Браузер не читает и не хранит ключ модели.
        </p>
        <p className="mt-3 text-sm leading-6 text-graphite">
          {status.configured
            ? `Сервер видит ключ (${status.keySource}). Запросы идут на ${status.baseUrl}, модель ${status.model}.`
            : "На сервере нет OPENAI_API_KEY (и TOKENLAVKA_KEY). Браузер ключ увидеть не может — задайте секрет в окружении хостинга (Render) и перезапустите сервис. Запрос сохранится со статусом «нужна настройка», без подставного текста анализа."}
        </p>
        {!user ? <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-navy">Войдите, чтобы запустить анализ</Link> : <div className="mt-6"><AiForm /></div>}
      </div>
      <section>
        <h2 className="font-display text-2xl font-semibold text-navy">История</h2>
        {!user ? <p className="mt-3 text-sm text-muted">История появится после входа.</p> : null}
        {user && reports.length === 0 ? <p className="mt-3 text-sm text-muted">Отчётов пока нет.</p> : null}
        <ul className="mt-4 grid gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Link href={`/ai-assessment/${report.id}`} className="block rounded-3xl border border-line bg-white p-5">
                <p className="font-semibold text-ink">{report.objectType}</p>
                <p className="mt-1 text-sm text-muted">{formatDateRu(report.createdAt)} · {report.status === "completed" ? `балл ${report.score}` : report.status === "unavailable" ? "нужна настройка API" : "анализ не выполнен"}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
