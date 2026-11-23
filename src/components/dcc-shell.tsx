import Link from "next/link";
import type { ReactNode } from "react";
import { DccMobileNav } from "@/components/dcc-mobile-nav";
import { OwnerBadge } from "@/components/owner-badge";
import { dccNav } from "@/lib/admin-nav";
import { roleLabel, type StaffProfile, hasPermission } from "@/lib/rbac";
import { logoutAction } from "@/app/actions/auth";
import { OWNER_HOME, dccHref } from "@/lib/staff-access";

export function DccShell({
  staff,
  children,
}: {
  staff: StaffProfile;
  children: ReactNode;
}) {
  const links = dccNav.filter((item) => !item.permission || hasPermission(staff, item.permission));
  const isOwner = staff.staffRole === "owner";
  return (
    <div
      className={
        isOwner
          ? "min-h-full bg-[radial-gradient(1200px_600px_at_10%_-10%,#3a1520_0%,transparent_55%),linear-gradient(165deg,#0b1220_0%,#121a2b_45%,#0e1522_100%)] text-slate-100"
          : "min-h-full bg-[linear-gradient(180deg,#f4f7fb_0%,#eef2f7_100%)] text-ink"
      }
    >
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <aside
          className={`hidden w-64 shrink-0 border-r p-5 lg:block ${
            isOwner ? "border-white/10 bg-black/25 backdrop-blur" : "border-line/80 bg-white/90"
          }`}
        >
          <Link href={OWNER_HOME} className={`font-display text-2xl font-semibold ${isOwner ? "text-white" : "text-navy"}`}>
            RentProof
          </Link>
          <p
            className={`mt-1 text-xs font-semibold uppercase tracking-wide ${
              isOwner ? "text-[#ff6b81]" : "text-accent"
            }`}
          >
            {isOwner ? "Owner Control Center" : "Developer Control Center"}
          </p>
          <nav className="mt-8 grid gap-1 text-sm" aria-label="Разделы Control Center">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isOwner
                    ? "rounded-xl px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    : "rounded-xl px-3 py-2 font-medium text-ink/80 transition hover:bg-mist hover:text-navy"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <header
            className={`sticky top-0 z-10 border-b backdrop-blur ${
              isOwner ? "border-white/10 bg-[#0b1220]/80" : "border-line/80 bg-white/90"
            }`}
          >
            <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <DccMobileNav
                links={links.map((item) => ({ href: item.href, label: item.label }))}
                dark={isOwner}
              />
              <form action={dccHref("/users")} className="min-w-[12rem] flex-1 sm:max-w-sm">
                <input
                  name="q"
                  placeholder="Поиск пользователей…"
                  className={
                    isOwner
                      ? "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#ff6b81]"
                      : "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy"
                  }
                />
              </form>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={dccHref("/notifications")}
                  className={`font-semibold ${isOwner ? "text-slate-200" : "text-navy"}`}
                >
                  Уведомления
                </Link>
                <div className="text-right">
                  <p
                    className={`flex items-center justify-end gap-2 font-semibold ${
                      isOwner ? "text-white" : "text-navy"
                    }`}
                  >
                    {staff.displayName}
                    {isOwner ? <OwnerBadge compact /> : null}
                  </p>
                  <p className={`text-xs ${isOwner ? "font-semibold text-[#ff6b81]" : "text-accent"}`}>
                    {roleLabel(staff.staffRole)}
                  </p>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className={
                      isOwner
                        ? "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                        : "rounded-xl border border-line px-3 py-2 text-sm font-semibold text-navy hover:bg-mist"
                    }
                  >
                    Выйти
                  </button>
                </form>
              </div>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
