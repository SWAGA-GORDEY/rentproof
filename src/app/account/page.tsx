import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LogoutButton } from "@/components/logout-button";
import { ProfileForm } from "@/components/profile-form";
import { secondaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { roleLabel } from "@/lib/validation";

export const metadata = {
  title: "Кабинет — RentProof",
};

export default function AccountPage() {
  return (
    <AuthShell title="Личный кабинет" lede="Данные профиля хранятся на сервере и доступны только вашей сессии.">
      <Suspense fallback={<p className="text-sm text-muted">Загружаем профиль…</p>}>
        <AccountPanel />
      </Suspense>
    </AuthShell>
  );
}

async function AccountPanel() {
  const user = await requireUser();
  const created = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(user.createdAt));
  const sectionHref = user.role === "landlord" ? "/account/landlord" : "/account/tenant";
  const sectionLabel = user.role === "landlord" ? "Раздел арендодателя" : "Раздел арендатора";

  return (
    <div className="grid gap-6">
      <dl className="grid gap-3 rounded-3xl border border-line bg-white p-6 text-sm">
        <Row label="Имя" value={user.name} />
        <Row label="Почта" value={user.email} />
        <Row label="Роль" value={roleLabel(user.role)} />
        <Row label="Телефон" value={user.phone ?? "Не указан"} />
        <Row label="Город" value={user.city ?? "Не указан"} />
        <Row label="Дата регистрации" value={created} />
      </dl>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Профиль</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Почту и роль изменить здесь нельзя.</p>
        <div className="mt-4">
          <ProfileForm user={user} />
        </div>
      </section>
      <Link href={sectionHref} className={secondaryButton}>
        {sectionLabel}
      </Link>
      <LogoutButton />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
