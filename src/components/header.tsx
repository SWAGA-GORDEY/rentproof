"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { PlaceListingLink } from "@/components/place-listing-link";
import { primaryButton } from "@/components/styles";
import { pageLinks } from "@/lib/navigation";

export type HeaderUser = { name: string; isAdmin: boolean } | null;

export function Header({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-t-4 border-b border-t-navy border-b-line bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="RentProof, на главную" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">
          <Logo />
        </Link>
        <nav aria-label="Разделы" className="hidden items-center gap-6 lg:flex">
          {pageLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-graphite transition hover:text-navy">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link href="/account" className="max-w-40 truncate text-sm font-medium text-graphite hover:text-navy">
                {user.name}
              </Link>
              {user.isAdmin ? (
                <Link href="/admin" className="text-sm font-medium text-graphite hover:text-navy">
                  Админ
                </Link>
              ) : null}
              <form action={logoutAction}>
                <button type="submit" className="text-sm font-medium text-graphite hover:text-navy">
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium text-graphite transition hover:text-navy">
              Войти
            </Link>
          )}
          <PlaceListingLink />
        </div>
        <button
          type="button"
          className={`${primaryButton} px-3 py-2 lg:hidden`}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Закрыть" : "Меню"}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Мобильные разделы" className="border-t border-line bg-white lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {pageLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-mist" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={user ? "/account" : "/login"} className="block rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-mist" onClick={() => setOpen(false)}>
                {user ? "Кабинет" : "Войти"}
              </Link>
            </li>
            {user?.isAdmin ? (
              <li>
                <Link href="/admin" className="block rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-mist" onClick={() => setOpen(false)}>
                  Админ
                </Link>
              </li>
            ) : null}
            {user ? (
              <li className="px-3 py-2">
                <LogoutButton />
              </li>
            ) : null}
            <li className="pt-2">
              <PlaceListingLink className={`${primaryButton} w-full`} onNavigate={() => setOpen(false)} />
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
