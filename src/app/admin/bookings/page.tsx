import { Suspense } from "react";
import Link from "next/link";
import { requireStaff } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { formatDateRu } from "@/lib/format";
import { dccHref } from "@/lib/staff-access";

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Заявки…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("listings.view");
  const rows = getDb()
    .prepare(
      `SELECT b.id, b.status, b.start_date, b.end_date, b.created_at,
              l.title AS listing_title, renters.email AS renter_email, owners.email AS owner_email
       FROM bookings b
       JOIN listings l ON l.id = b.listing_id
       JOIN users renters ON renters.id = b.renter_id
       JOIN users owners ON owners.id = l.owner_id
       ORDER BY b.created_at DESC LIMIT 80`,
    )
    .all() as Array<{
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    created_at: string;
    listing_title: string;
    renter_email: string;
    owner_email: string;
  }>;

  const deals = getDb()
    .prepare(
      `SELECT id, rental_status, deal_status, payment_status, total_amount_kopecks, created_at
       FROM rental_orders ORDER BY created_at DESC LIMIT 40`,
    )
    .all() as Array<{
    id: string;
    rental_status: string;
    deal_status: string;
    payment_status: string;
    total_amount_kopecks: number;
    created_at: string;
  }>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Bookings & Deals</h1>
        <p className="mt-2 text-sm text-muted">Живые заявки и rental_orders из PostgreSQL/SQLite — без демо-цифр.</p>
      </div>
      <section className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Объявление</th>
              <th className="px-4 py-3">Арендатор</th>
              <th className="px-4 py-3">Владелец</th>
              <th className="px-4 py-3">Срок</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Создано</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted">
                  Заявок пока нет.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-line/70">
                  <td className="px-4 py-3 font-medium text-ink">{row.listing_title}</td>
                  <td className="px-4 py-3 text-muted">{row.renter_email}</td>
                  <td className="px-4 py-3 text-muted">{row.owner_email}</td>
                  <td className="px-4 py-3">
                    {row.start_date} — {row.end_date}
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 text-muted">{formatDateRu(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-3xl border border-line bg-white">
        <h2 className="border-b border-line px-4 py-3 font-display text-xl font-semibold text-navy">Rental orders / deals</h2>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Rental</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Сумма (коп.)</th>
              <th className="px-4 py-3">Создано</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted">
                  Сделок пока нет.
                </td>
              </tr>
            ) : (
              deals.map((row) => (
                <tr key={row.id} className="border-b border-line/70">
                  <td className="px-4 py-3 font-mono text-xs">{row.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{row.rental_status}</td>
                  <td className="px-4 py-3">{row.deal_status}</td>
                  <td className="px-4 py-3">{row.payment_status}</td>
                  <td className="px-4 py-3">{row.total_amount_kopecks}</td>
                  <td className="px-4 py-3 text-muted">{formatDateRu(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">
        Рефералы: <Link className="text-navy underline" href={dccHref("/referrals")}>открыть раздел</Link>
      </p>
    </div>
  );
}
