import { Suspense } from "react";
import { connection } from "next/server";
import { hideReviewAction, resolveComplaintAction } from "@/app/actions/admin";
import { fieldClass, secondaryButton } from "@/components/styles";
import { listComplaints } from "@/lib/complaints";
import { getDb } from "@/lib/db";

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем жалобы…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await connection();
  const complaints = listComplaints();
  const reviews = getDb()
    .prepare(
      `SELECT reviews.id, reviews.rating, reviews.body, reviews.status, users.name
       FROM reviews JOIN users ON users.id = reviews.author_id
       ORDER BY reviews.created_at DESC LIMIT 30`,
    )
    .all() as Array<{ id: string; rating: number; body: string; status: string; name: string }>;
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Жалобы и отзывы</h1>
      {complaints.length === 0 ? <p className="text-sm text-muted">Жалоб нет.</p> : null}
      <ul className="grid gap-3">
        {complaints.map((complaint) => (
          <li key={complaint.id} className="rounded-3xl border border-line bg-white p-5 text-sm">
            <p className="font-semibold text-ink">{complaint.status} · {complaint.targetType}</p>
            <p className="mt-2 text-graphite">{complaint.reason}</p>
            <p className="mt-1 text-muted">{complaint.reporterName}</p>
            {complaint.status === "open" ? (
              <form action={resolveComplaintAction} className="mt-3 grid gap-2">
                <input type="hidden" name="complaintId" value={complaint.id} />
                <input name="resolution" placeholder="Решение" className={fieldClass} />
                <div className="flex gap-2">
                  <button name="status" value="resolved" className={secondaryButton} type="submit">Закрыть</button>
                  <button name="status" value="dismissed" className={secondaryButton} type="submit">Отклонить</button>
                </div>
              </form>
            ) : <p className="mt-2 text-muted">{complaint.resolution}</p>}
          </li>
        ))}
      </ul>
      <section className="grid gap-3">
        <h2 className="font-display text-2xl font-semibold text-navy">Отзывы</h2>
        {reviews.map((review) => (
          <form key={review.id} action={hideReviewAction} className="rounded-3xl border border-line bg-white p-5 text-sm">
            <input type="hidden" name="reviewId" value={review.id} />
            <p className="font-semibold text-ink">{review.name} · {review.rating} · {review.status}</p>
            <p className="mt-2 text-graphite">{review.body}</p>
            <button name="status" value={review.status === "hidden" ? "published" : "hidden"} className={`${secondaryButton} mt-3`} type="submit">
              {review.status === "hidden" ? "Показать" : "Скрыть"}
            </button>
          </form>
        ))}
      </section>
    </div>
  );
}
