import Link from "next/link";
import { secondaryButton } from "@/components/styles";

export function AccessDenied({ roleName }: { roleName: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6">
      <h2 className="font-display text-2xl font-semibold text-navy">Недостаточно прав</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Этот раздел открыт только для роли «{roleName}». Ваша роль записана в профиле и здесь не меняется.
      </p>
      <Link href="/account" className={`${secondaryButton} mt-6`}>
        Вернуться в кабинет
      </Link>
    </div>
  );
}
