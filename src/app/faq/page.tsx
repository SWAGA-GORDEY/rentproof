import { PageShell } from "@/components/page-shell";

export const metadata = { title: "Вопросы — RentProof", description: "Короткие ответы о каталоге, бронировании, AI и оплате." };

const items = [
  ["Можно ли оплатить аренду на сайте?", "Нет. Суммы на экране — демонстрационный расчёт. Платёжный провайдер не подключён."],
  ["Кто публикует объявление?", "Автор отправляет его на модерацию. В каталог оно попадает после решения администратора."],
  ["Что означает балл AI?", "Это визуальная оценка загруженных фотографий от 0 до 100. Она не доказывает исправность."],
  ["Почему нет письма?", "Почтовый сервер не настроен, поэтому письма не отправляются. События остаются в кабинете."],
  ["Можно ли оставить отзыв заранее?", "Нет. Отзыв привязан к завершённому бронированию и сохраняется один раз."],
];

export default function FaqPage() {
  return (
    <PageShell>
      <h1 className="font-display text-4xl font-semibold text-navy">Вопросы</h1>
      <div className="mt-8 grid gap-3">
        {items.map(([title, text]) => (
          <details key={title} className="rounded-3xl border border-line bg-white p-5">
            <summary className="cursor-pointer font-semibold text-navy">{title}</summary>
            <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
