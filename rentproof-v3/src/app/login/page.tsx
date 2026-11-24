import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";

export const metadata: Metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; verified?: string; email?: string }> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error.slice(0, 160) : "";
  const next = typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account";
  const verified = params.verified === "1";
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1fr] lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card sm:p-9"><p className="eyebrow">Рады видеть снова</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Войти в RentProof</h1><p className="mt-2 text-sm text-slate-500">Заявки, объявления и условия аренды — в вашем кабинете.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        {verified && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Email подтверждён. Теперь войдите в аккаунт.</p>}
        <form action={loginAction} className="mt-7 grid gap-4"><input type="hidden" name="next" value={next}/><label className="grid gap-2 text-sm font-bold text-slate-700">Email<input className="field" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com"/></label><label className="grid gap-2 text-sm font-bold text-slate-700">Пароль<input className="field" name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Ваш пароль"/></label><button className="button-primary mt-2 w-full" type="submit">Войти <span aria-hidden="true">→</span></button></form>
        <p className="mt-6 text-center text-sm text-slate-500">Нет аккаунта? <Link className="font-extrabold text-teal-700" href="/register">Создать</Link></p>
      </section>
      <aside className="hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#d5e9de] to-[#b9d5c9] p-10 lg:flex lg:flex-col lg:justify-between"><span className="grid size-14 place-items-center rounded-2xl bg-white text-2xl shadow-soft">✦</span><div><p className="text-xs font-black tracking-[.15em] text-teal-800 uppercase">RentProof помогает</p><h2 className="mt-3 max-w-md text-4xl font-black leading-tight tracking-tight text-slate-950">Сравнить до того, как договорились.</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-700">Уточняйте сроки, стоимость и залог заранее. Отправьте заявку — владелец подтвердит даты.</p></div><div className="flex gap-3 text-xs font-bold text-slate-700"><span>✓ Цена за день</span><span>✓ Залог</span><span>✓ Состояние</span></div></aside>
    </div>
  );
}
