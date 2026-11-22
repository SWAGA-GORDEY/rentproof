import Link from "next/link";

const topics = [
  {
    title: "Аренда оборудования",
    text: "Сравнивайте предложения по городу, цене за сутки и залогу. В карточке собраны фото и условия до отправки заявки.",
    href: "/catalog",
  },
  {
    title: "Строительная техника и инструмент",
    text: "Отдельные категории помогают быстрее найти оснастку для площадки или электроинструмент под задачу.",
    href: "/categories/construction",
  },
  {
    title: "Проверка состояния с помощью ИИ",
    text: "Визуальная оценка описывает видимые повреждения по загруженным снимкам и не заменяет осмотр или экспертизу.",
    href: "/how-it-works",
  },
];

/** Below-the-fold informational block for public SEO landing content. */
export function SeoTopics() {
  return (
    <section className="border-t border-line bg-white py-16 sm:py-20" aria-labelledby="seo-topics-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="seo-topics-heading" className="font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Аренда имущества с понятными условиями
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
          RentProof собирает объявления об аренде оборудования, строительной техники и инструмента. Перед сделкой можно
          изучить описание, залог и материалы о состоянии, а при необходимости запустить серверную визуальную оценку фотографий.
        </p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {topics.map((topic) => (
            <li key={topic.title}>
              <h3 className="font-display text-xl font-semibold text-navy">{topic.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{topic.text}</p>
              <Link href={topic.href} className="mt-3 inline-flex text-sm font-semibold text-navy">
                Подробнее
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
