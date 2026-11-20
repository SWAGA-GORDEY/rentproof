import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/current-user";

export const metadata = {
  title: "Арендодатель — RentProof",
};

export default function LandlordPage() {
  return (
    <AuthShell
      title="Раздел арендодателя"
      lede="Доступ есть только у учётных записей с ролью арендодателя."
    >
      <Suspense fallback={<p className="text-sm text-muted">Проверяем доступ…</p>}>
        <LandlordPanel />
      </Suspense>
    </AuthShell>
  );
}

async function LandlordPanel() {
  const user = await requireUser();
  if (user.role !== "landlord") {
    return <AccessDenied roleName="Арендодатель" />;
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-6 text-sm leading-6 text-muted">
      <p>Вы вошли как арендодатель, {user.name}.</p>
      <p className="mt-3">Публикация объявлений появится на следующем этапе. Сейчас этот раздел только проверяет роль.</p>
    </div>
  );
}
