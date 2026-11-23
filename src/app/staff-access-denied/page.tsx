import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { OWNER_HOME } from "@/lib/staff-access";

export const metadata = {
  title: "Нет доступа к Control Center",
  robots: { index: false, follow: false },
};

export default function StaffAccessDeniedPage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-muted">Проверяем доступ…</main>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Доступ запрещён</p>
      <h1 className="font-display text-3xl font-semibold text-navy">Это не страница 404</h1>
      <p className="text-sm text-muted">
        Маршруты <code className="rounded bg-mist px-1">/owner</code>,{" "}
        <code className="rounded bg-mist px-1">/admin</code> и{" "}
        <code className="rounded bg-mist px-1">/control-center</code> существуют. Сюда попадают только
        пользователи без роли OWNER / ADMIN / STAFF (или с неподтверждённым email).
      </p>
      {user ? (
        <p className="rounded-2xl border border-line bg-white p-4 text-sm">
          Вы вошли как <strong>{user.email}</strong>. Для OWNER нужен серверный бинд через{" "}
          <code className="rounded bg-mist px-1">OWNER_EMAIL</code> на существующий аккаунт и перезапуск
          сервиса.
        </p>
      ) : (
        <p className="text-sm text-muted">Сессия не найдена. Войдите в аккаунт владельца.</p>
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          className="rounded-xl bg-navy px-4 py-2 font-semibold text-white"
          href={`/login?next=${encodeURIComponent(OWNER_HOME)}`}
        >
          Войти
        </Link>
        <Link className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-navy" href="/account">
          Личный кабинет
        </Link>
        <Link className="rounded-xl border border-line bg-white px-4 py-2 font-semibold text-navy" href="/">
          На главную
        </Link>
      </div>
    </main>
  );
}
