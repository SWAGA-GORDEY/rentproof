import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Поддержка",
  description: "Помощь по каталогу аренды, заявкам, кабинету и визуальной оценке состояния на RentProof.",
  path: "/support",
});

const topics = [
  {
    title: "Каталог и объявления",
    text: "Ищите оборудование и технику по категории, городу и цене. Опубликованные карточки проходят модерацию.",
    href: "/catalog",
    label: "Открыть каталог",
  },
  {
    title: "Заявки и кабинет",
    text: "После входа доступны бронирования, избранное и история. Письма уходят только если настроен почтовый сервер.",
    href: "/faq",
    label: "Частые вопросы",
  },
  {
    title: "Визуальная оценка",
    text: "Модуль ИИ разбирает загруженные фото на сервере. Это не экспертиза и не гарантия исправности.",
    href: "/how-it-works",
    label: "Как это работает",
  },
];

export default function SupportPage() {
  return (
    <PageShell>
      <article className="mx-auto grid max-w-3xl gap-8">
        <header>
          <h1 className="font-display text-4xl font-semibold text-navy">Поддержка</h1>
          <p className="mt-4 text-base leading-7 text-graphite">
            Здесь собраны ссылки по аренде оборудования, работе кабинета и оценке состояния. Если нужна персональная помощь,
            напишите через форму контактов — сообщение сохраняется на сервере.
          </p>
        </header>
        <section className="grid gap-4" aria-labelledby="support-topics">
          <h2 id="support-topics" className="font-display text-2xl font-semibold text-navy">
            Разделы помощи
          </h2>
          <ul className="grid gap-3">
            {topics.map((topic) => (
              <li key={topic.title} className="rounded-3xl border border-line bg-white p-5">
                <h3 className="font-semibold text-navy">{topic.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{topic.text}</p>
                <Link href={topic.href} className="mt-3 inline-flex text-sm font-semibold text-navy">
                  {topic.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-sm leading-6 text-muted">
          Контакты: <Link href="/contacts" className="font-semibold text-navy">форма обратной связи</Link>. Политика данных:{" "}
          <Link href="/privacy" className="font-semibold text-navy">конфиденциальность</Link>.
        </p>
      </article>
    </PageShell>
  );
}
