import Link from "next/link";
import type { ReactNode } from "react";
import { dccNav } from "@/lib/admin-nav";
import { roleLabel, type StaffProfile, hasPermission } from "@/lib/rbac";
import { logoutAction } from "@/app/actions/auth";
import { quietButton } from "@/components/styles";

export function DccShell({
  staff,
  children,
}: {
  staff: StaffProfile;
  children: ReactNode;
}) {
  const links = dccNav.filter((item) => !item.permission || hasPermission(staff, item.permission));
  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f4f7fb_0%,#eef2f7_100%)] text-ink">
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <aside className="hidden w-64 shrink-0 border-r border-line/80 bg-white/90 p-5 lg:block">
          <Link href="/admin" className="font-display text-2xl font-semibold text-navy">
            RentProof
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">Developer Control Center</p>
          <nav className="mt-8 grid gap-1 text-sm">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 font-medium text-ink/80 transition hover:bg-mist hover:text-navy"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-wrap gap-2 lg:hidden">
              {links.slice(0, 6).map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg bg-mist px-2 py-1 text-xs font-semibold text-navy">
                  {item.label}
                </Link>
              ))}
            </div>
            <form action="/admin/users" className="min-w-[12rem] flex-1 sm:max-w-sm">
              <input
                name="q"
                placeholder="Поиск пользователей…"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy"
              />
            </form>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/admin/notifications" className="font-semibold text-navy">
                Уведомления
              </Link>
              <div className="text-right">
                <p className="font-semibold text-navy">{staff.displayName}</p>
                <p className="text-xs text-accent">{roleLabel(staff.staffRole)}</p>
              </div>
              <form action={logoutAction}>
                <button type="submit" className={quietButton}>
                  Выйти
                </button>
              </form>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
