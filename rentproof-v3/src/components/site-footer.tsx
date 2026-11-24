import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} RentProof. Аренда с понятными условиями.</p>
        <div className="flex gap-5"><Link href="/catalog">Каталог</Link><Link href="/register">Создать аккаунт</Link><Link href="/login">Войти</Link></div>
      </div>
    </footer>
  );
}
