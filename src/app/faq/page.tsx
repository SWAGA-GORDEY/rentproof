import { PageShell } from "@/components/page-shell";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Вопросы и ответы",
  description: "Короткие ответы о каталоге аренды, бронировании, визуальной оценке и оплате на RentProof.",
  path: "/faq",
});

const items = [
  [
    "Можно ли оплатить аренду на сайте?",
    "Оплата через ЮKassa включается только когда владелец задаёт RENTPROOF_PAYMENTS_ENABLED=1 и тестовые ключи. Без этого суммы на экране — расчёт, списаний нет.",
  ],
  ["Кто публикует объявление?", "Автор отправляет его на модерацию. В каталог оно попадает после решения администратора."],
  [
    "Что означает балл AI?",
    "Это визуальная оценка загруженных фотографий от 0 до 100. Она не доказывает исправность и не видит скрытые неисправности.",
  ],
  [
    "Почему нет письма?",
    "Письма уходят только при настроенном Resend или SMTP. Пока канал не подключён, код создаётся на сервере, но delivered=false.",
  ],
  ["Можно ли оставить отзыв заранее?", "Нет. Отзыв привязан к завершённому бронированию и сохраняется один раз."],
  [
    "Как работает реферальная ссылка?",
    "В настройках аккаунта есть персональная ссылка. Приглашение учитывается один раз. Денежные бонусы автоматически не начисляются.",
  ],
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
