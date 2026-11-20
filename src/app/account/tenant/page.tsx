import { Suspense } from "react";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { primaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";

export const metadata = { title: "Арендатор — RentProof" };

export default function TenantPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Проверяем доступ…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  if (user.role !== "tenant") {
    return <AccessDenied roleName="Арендатор" />;
  }
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Раздел арендатора</h1>
      <p className="text-sm leading-6 text-muted">{user.name}, заявки и избранное доступны только вашей сессии.</p>
      <Link href="/catalog" className={primaryButton}>Открыть каталог</Link>
      <Link href="/account/bookings" className="text-sm font-semibold text-navy">Мои заявки</Link>
    </div>
  );
}
