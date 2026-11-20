import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { primaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";

export const metadata = { title: "Арендодатель — RentProof" };

export default function LandlordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Проверяем доступ…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  if (user.role !== "landlord") {
    return <AccessDenied roleName="Арендодатель" />;
  }
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Раздел арендодателя</h1>
      <p className="text-sm leading-6 text-muted">{user.name}, здесь собраны действия владельца объявлений. Доступ проверяется на сервере.</p>
      <Link href="/listings/create" className={primaryButton}>Новое объявление</Link>
      <Link href="/account/listings" className="text-sm font-semibold text-navy">Мои объявления</Link>
      <Link href="/account/bookings" className="text-sm font-semibold text-navy">Входящие заявки</Link>
    </div>
  );
}
