import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookingDecisionAction } from "@/app/actions/bookings";
import { EvidenceForm, ReviewForm } from "@/components/simple-forms";
import { UploadImage } from "@/components/upload-image";
import { secondaryButton } from "@/components/styles";
import { bookingStatusLabel, getBookingForParty } from "@/lib/bookings";
import { requireUser } from "@/lib/current-user";
import { listEvidence } from "@/lib/evidence";
import { formatDateRu, formatRubles } from "@/lib/format";

type Params = { id: string };

export const metadata = { title: "Заявка — RentProof" };

export default function BookingDetailsPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем заявку…</p>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  const user = await requireUser();
  const { id } = await params;
  const booking = getBookingForParty(user.id, user.isAdmin, id);
  if (!booking) {
    notFound();
  }
  const evidence = listEvidence(user.id, user.isAdmin, id);
  const before = evidence.filter((item) => item.phase === "before");
  const after = evidence.filter((item) => item.phase === "after");
  const renter = booking.renterId === user.id;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">{bookingStatusLabel(booking.status)}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-navy">{booking.listingTitle}</h1>
        <p className="mt-2 text-sm text-muted">{booking.listingCity} · {formatDateRu(booking.startDate)} — {formatDateRu(booking.endDate)}</p>
        <p className="mt-2 text-sm text-ink">{booking.days} сут. · аренда {formatRubles(booking.rentAmount)} · залог {formatRubles(booking.depositAmount)}</p>
        <p className="mt-2 text-xs text-muted">Расчёт демонстрационный. Деньги не списываются.</p>
        <p className="mt-3 text-sm text-muted">Арендодатель: {booking.ownerName}. Арендатор: {booking.renterName}.</p>
        {booking.note ? <p className="mt-3 text-sm text-graphite">{booking.note}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/catalog/${booking.listingId}`} className={secondaryButton}>Карточка</Link>
        {booking.ownerId === user.id && booking.status === "pending" ? <Decision id={booking.id} decision="confirm" label="Подтвердить" /> : null}
        {booking.ownerId === user.id && booking.status === "pending" ? <Decision id={booking.id} decision="reject" label="Отклонить" /> : null}
        {(booking.status === "pending" || booking.status === "confirmed") ? <Decision id={booking.id} decision="cancel" label="Отменить" /> : null}
        {booking.status === "confirmed" ? <Decision id={booking.id} decision="complete" label="Завершить" /> : null}
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <EvidenceColumn title="До аренды" items={before} />
        <EvidenceColumn title="После аренды" items={after} />
      </section>
      <p className="text-xs leading-5 text-muted">Материалы показывают, кто и когда их загрузил. Обычные фотографии сами по себе не имеют гарантированной доказательной силы.</p>
      <EvidenceForm bookingId={booking.id} />
      {renter && booking.status === "completed" ? <ReviewForm bookingId={booking.id} /> : null}
    </div>
  );
}

function EvidenceColumn({ title, items }: { title: string; items: Array<{ id: string; authorName: string; description: string; createdAt: string; images: Array<{ id: string }> }> }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-semibold text-navy">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-sm text-muted">Пока ничего не загружено.</p> : null}
      <ul className="mt-3 space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <p className="text-sm font-semibold text-ink">{item.authorName}</p>
            <p className="text-xs text-muted">{formatDateRu(item.createdAt)}</p>
            <p className="mt-1 text-sm text-graphite">{item.description}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {item.images.map((image) => (
                <UploadImage key={image.id} src={`/media/${image.id}`} alt="" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Decision({ id, decision, label }: { id: string; decision: string; label: string }) {
  return (
    <form action={bookingDecisionAction}>
      <input type="hidden" name="bookingId" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="returnTo" value={`/account/bookings/${id}`} />
      <button className={secondaryButton} type="submit">{label}</button>
    </form>
  );
}
