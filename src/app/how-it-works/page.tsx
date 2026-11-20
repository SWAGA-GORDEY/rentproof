import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Как это работает — RentProof",
  description: "Путь от объявления до заявки, фиксации состояния и отзыва.",
};

const steps = [
  ["Аккаунт", "Регистрация арендатора или арендодателя. Пароль хранится как scrypt-хеш."],
  ["Объявление", "Владелец сохраняет черновик, добавляет фото и отправляет карточку на модерацию."],
  ["Каталог", "Опубликованные предложения ищутся по городу, категории, цене и доступности."],
  ["Заявка", "Арендатор выбирает даты и видит расчёт суток, аренды и залога. Деньги не списываются."],
  ["Состояние", "Стороны прикладывают фото до и после. Это история загрузок, а не юридическое заключение."],
  ["Отзыв", "После завершения аренды арендатор оставляет одну оценку. Средний балл считается на сервере."],
];

export default function HowPage() {
  return (
    <PageShell>
      <h1 className="font-display text-4xl font-semibold text-navy">Как это работает</h1>
      <ol className="mt-8 grid gap-4">
        {steps.map(([title, text], index) => (
          <li key={title} className="rounded-3xl border border-line bg-white p-6">
            <p className="text-xs font-semibold text-accent">0{index + 1}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
