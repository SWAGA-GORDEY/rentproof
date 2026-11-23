import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function AuthShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-t-4 border-b border-t-navy border-b-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <Link href="/" aria-label="RentProof, на главную" className="rounded-lg">
            <Logo />
          </Link>
          <nav
            aria-label="Вход и кабинет"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-graphite"
          >
            <Link href="/login" className="whitespace-nowrap hover:text-navy">
              Войти
            </Link>
            <Link href="/register" className="whitespace-nowrap hover:text-navy">
              Регистрация
            </Link>
            <Link href="/account" className="whitespace-nowrap hover:text-navy">
              Кабинет
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">{title}</h1>
        <p className="mt-3 text-base leading-7 text-muted">{lede}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
