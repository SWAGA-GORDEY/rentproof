import { Suspense } from "react";
import { AccessDenied } from "@/components/access-denied";
import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/current-user";

export const metadata = {
  title: "Арендатор — RentProof",
};

export default function TenantPage() {
  return (
    <AuthShell title="Раздел арендатора" lede="Доступ есть только у учётных записей с ролью арендатора.">
      <Suspense fallback={<p className="text-sm text-muted">Проверяем доступ…</p>}>
        <TenantPanel />
      </Suspense>
    </AuthShell>
  );
}

async function TenantPanel() {
  const user = await requireUser();
  if (user.role !== "tenant") {
    return <AccessDenied roleName="Арендатор" />;
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-6 text-sm leading-6 text-muted">
      <p>Вы вошли как арендатор, {user.name}.</p>
      <p className="mt-3">Заявки на аренду появятся на следующем этапе. Сейчас этот раздел только проверяет роль.</p>
    </div>
  );
}
