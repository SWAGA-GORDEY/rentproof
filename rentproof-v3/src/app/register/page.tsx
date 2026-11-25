import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions";

export const metadata: Metadata = { title: "Создать аккаунт" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; role?: string }> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error.slice(0, 180) : "";
  const role = params.role === "owner" ? "owner" : "tenant";
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
      <aside className="hidden rounded-[2rem] bg-[#112b31] p-9 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-xs font-black tracking-[.16em] text-teal-300 uppercase">RentProof</p><h1 className="mt-7 text-4xl font-black leading-tight tracking-tight">Одна площадка.<br/>Две стороны<br/>хорошей аренды.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Находите оборудование или размещайте своё. Заранее покажите цену, залог и состояние.</p></div><div className="flex gap-2 text-xs font-bold text-slate-300"><span className="rounded-full bg-white/10 px-3 py-2">Без скрытой цены</span><span className="rounded-full bg-white/10 px-3 py-2">Запрос до аренды</span></div></aside>
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card sm:p-9"><p className="eyebrow">Присоединяйтесь</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Создать аккаунт</h2><p className="mt-2 text-sm text-slate-500">Это займёт меньше минуты.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <form action={registerAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">Как к вам обращаться<input className="field" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Ваше имя"/></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Email<input className="field" name="email" required type="email" maxLength={254} autoComplete="email" placeholder="name@example.com"/></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Пароль<input className="field" name="password" required type="password" minLength={10} maxLength={128} autoComplete="new-password" placeholder="Не менее 10 символов"/><span className="text-xs font-medium text-slate-400">Используйте длинный пароль, который не применяете на других сайтах.</span></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Я хочу<select name="role" className="field" defaultValue={role}><option value="tenant">Брать вещи в аренду</option><option value="owner">Сдавать свои вещи</option></select></label>
          <label className="flex items-start gap-3 text-xs leading-5 text-slate-500"><input className="mt-1 size-4 accent-teal-700" type="checkbox" name="terms" required/><span>Я согласен с правилами сервиса и понимаю, что стоимость и залог согласуются с владельцем напрямую.</span></label>
          <button className="button-primary mt-1 w-full" type="submit">Создать аккаунт <span aria-hidden="true">→</span></button>
        </form><p className="mt-6 text-center text-sm text-slate-500">Уже зарегистрированы? <Link className="font-extrabold text-teal-700" href="/login">Войти</Link></p>
      </section>
    </div>
  );
}
