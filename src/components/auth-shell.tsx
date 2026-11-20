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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="RentProof, на главную" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Вход и кабинет" className="flex items-center gap-4 text-sm font-medium text-graphite">
            <Link href="/login" className="hover:text-navy">
              Войти
            </Link>
            <Link href="/register" className="hover:text-navy">
              Регистрация
            </Link>
            <Link href="/account" className="hover:text-navy">
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
