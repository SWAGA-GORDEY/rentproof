import { Suspense } from "react";
import { requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { listUserReviews, userRating } from "@/lib/reviews";

export const metadata = { title: "Отзывы — RentProof" };

export default function ReviewsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем отзывы…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const reviews = listUserReviews(user.id);
  const rating = userRating(user.id);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Отзывы</h1>
      <p className="text-sm text-muted">
        {rating.count > 0 ? `Ваша средняя оценка как арендодателя: ${rating.average} из 5, отзывов ${rating.count}.` : "Оценок в ваш адрес пока нет."} Рейтинг считается на сервере и не задаётся из формы.
      </p>
      {reviews.length === 0 ? <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Отзывов пока нет. Их можно оставить после завершённой аренды.</p> : null}
      <ul className="grid gap-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-sm font-semibold text-ink">{review.listingTitle} · {review.rating} из 5</p>
            <p className="mt-2 text-sm leading-6 text-graphite">{review.body}</p>
            <p className="mt-2 text-xs text-muted">{review.authorName} · {formatDateRu(review.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
