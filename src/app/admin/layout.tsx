import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { requireAdmin } from "@/lib/current-user";

export const metadata = {
  title: "Администрирование",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-sm text-muted">Проверяем права…</p>}>
          <Guard>{children}</Guard>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

async function Guard({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid gap-6">
      <nav aria-label="Администрирование" className="flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/admin" className="text-navy">Обзор</Link>
        <Link href="/admin/users" className="text-navy">Пользователи</Link>
        <Link href="/admin/listings" className="text-navy">Объявления</Link>
        <Link href="/admin/reports" className="text-navy">Жалобы</Link>
      </nav>
      {children}
    </div>
  );
}
