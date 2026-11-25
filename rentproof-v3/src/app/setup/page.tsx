import type { Metadata } from "next";
import { bootstrapOwnerAction } from "@/app/actions";

export const metadata: Metadata = { title: "Первичная настройка владельца" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error.slice(0, 180) : "";
  return <div className="mx-auto max-w-xl px-4 py-12 sm:py-20"><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card sm:p-9"><p className="eyebrow">Безопасная настройка</p><h1 className="mt-2 text-3xl font-black tracking-tight">Создать администратора</h1><p className="mt-3 text-sm leading-6 text-slate-600">Первичный администратор создаётся только для адреса OWNER_EMAIL и при наличии OWNER_BOOTSTRAP_TOKEN на сервере. Форма доступна до создания первого администратора.</p>{error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}<form action={bootstrapOwnerAction} className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-bold">Имя<input className="field" name="name" required minLength={2} maxLength={80}/></label><label className="grid gap-2 text-sm font-bold">Email владельца<input className="field" name="email" type="email" required maxLength={254}/></label><label className="grid gap-2 text-sm font-bold">Пароль<input className="field" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label><label className="grid gap-2 text-sm font-bold">Ключ первичной настройки<input className="field" name="token" type="password" required minLength={24} autoComplete="off"/></label><button className="button-primary w-full" type="submit">Создать администратора</button></form></section></div>;
}
