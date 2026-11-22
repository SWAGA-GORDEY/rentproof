import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { UploadImage } from "@/components/upload-image";
import { AI_DISCLAIMER, AI_METHODOLOGY, getAiReport } from "@/lib/ai";
import { requireUser } from "@/lib/current-user";

type Params = { id: string };

export const metadata = {
  title: "Отчёт оценки",
  robots: { index: false, follow: false },
};

export default function AiReportPage({ params }: { params: Promise<Params> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем отчёт…</p>}>
        <Body params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  const user = await requireUser();
  const { id } = await params;
  const report = getAiReport(user.id, user.isAdmin, id);
  if (!report) {
    notFound();
  }
  return (
    <article className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">{report.status}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-navy">{report.objectType}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{report.description}</p>
        {report.knownDefects ? <p className="mt-2 text-sm text-graphite">Со слов пользователя: {report.knownDefects}</p> : null}
      </div>
      {report.images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {report.images.map((image) => (
            <li key={image.id}><UploadImage src={`/media/${image.id}`} alt="Загруженный кадр для оценки" className="aspect-square w-full rounded-2xl object-cover" /></li>
          ))}
        </ul>
      ) : null}
      {report.status === "unavailable" ? (
        <section className="rounded-3xl border border-line bg-white p-6 text-sm leading-6 text-graphite">
          <h2 className="font-display text-xl font-semibold text-navy">Нужна настройка модели</h2>
          <p className="mt-3">
            На сервере не задан API-ключ (OPENAI_API_KEY или TOKENLAVKA_KEY), поэтому анализ не запускался.
            Ключ читается только из process.env на бэкенде — браузер и localStorage его не используют.
          </p>
          <p className="mt-3">
            Задайте секреты на Render: OPENAI_API_KEY, OPENAI_BASE_URL=https://tokenlavka.com/v1, OPENAI_MODEL (или OPENAI_VISION_MODEL).
            Подробности — в docs/AI_SETUP.md. После настройки повторите загрузку фотографий.
          </p>
        </section>
      ) : null}
      {report.status === "failed" ? (
        <section className="rounded-3xl border border-line bg-white p-6 text-sm text-graphite">
          <p>Поставщик модели не вернул пригодный отчёт.</p>
          {report.errorCode ? (
            <p className="mt-2 text-muted">Код диагностики: {report.errorCode} (значение ключа никогда не показывается).</p>
          ) : null}
          <p className="mt-2">Проверьте ключ, OPENAI_BASE_URL (должен быть https://tokenlavka.com/v1) и имя модели. Администратор может вызвать POST /api/ai/connection.</p>
        </section>
      ) : null}
      {report.status === "completed" && report.body ? (
        <section className="grid gap-4 rounded-3xl border border-line bg-white p-6">
          <p className="font-display text-5xl font-semibold text-navy">{report.score}<span className="text-lg text-muted"> / 100</span></p>
          <p className="text-sm text-muted">Уверенность модели: {report.confidence ?? "—"}{report.model ? ` · ${report.model}` : ""}</p>
          <p className="text-sm leading-6 text-graphite">{AI_METHODOLOGY}</p>
          <Block title="Описание кадра" text={report.body.objectDescription} />
          <List title="Наблюдения" items={report.body.observations} />
          <List title="Видимые повреждения" items={report.body.visibleDamage} />
          <List title="Износ" items={report.body.wear} />
          <List title="Царапины" items={report.body.scratches} />
          <List title="Трещины" items={report.body.cracks} />
          <List title="Особенности" items={report.body.features} />
          <Block title="Качество фотографий" text={report.body.photoQuality} />
          <List title="Зоны неопределённости" items={report.body.uncertainty} />
          <List title="Какие кадры стоит добавить" items={report.body.extraPhotos} />
          <List title="Предположения, не факты" items={report.body.assumptions} />
          <Block title="Заключение модели" text={report.body.conclusion} />
          <p className="text-sm leading-6 text-muted">{AI_DISCLAIMER}</p>
        </section>
      ) : null}
      <Link href="/ai-assessment" className="text-sm font-semibold text-navy">К истории оценок</Link>
    </article>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="font-semibold text-navy">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-graphite">{text || "Нет данных"}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="font-semibold text-navy">{title}</h2>
      {items.length === 0 ? <p className="mt-1 text-sm text-muted">Не отмечено</p> : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-graphite">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
