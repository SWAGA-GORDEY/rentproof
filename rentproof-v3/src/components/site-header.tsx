import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/" aria-label="RentProof — главная">
          <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-lg font-bold text-white shadow-soft">R</span>
          <span className="text-[1.08rem] font-extrabold tracking-tight text-slate-950">rentproof<span className="text-teal-600">.</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex" aria-label="Основная навигация">
          <Link href="/catalog" className="transition hover:text-slate-950">Каталог</Link>
          <Link href="/#how" className="transition hover:text-slate-950">Как это работает</Link>
          <Link href="/#ai" className="transition hover:text-slate-950">AI-проверка</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.role === "admin" && <Link className="hidden rounded-full px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:inline-flex" href="/owner">Админка</Link>}
              <Link className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800" href="/account">Кабинет</Link>
              <form action={logoutAction} className="hidden sm:block"><button className="px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-950">Выйти</button></form>
            </>
          ) : (
            <>
              <Link className="hidden rounded-full px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:inline-flex" href="/login">Войти</Link>
              <Link className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800" href="/register">Начать бесплатно</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
