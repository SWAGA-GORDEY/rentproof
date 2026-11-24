import type { Metadata } from "next";
import Link from "next/link";
import { resendVerificationAction, verifyEmailAction } from "@/app/actions";

export const metadata: Metadata = { title: "Подтвердить email" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; sent?: string }> }) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.slice(0, 254) : "";
  const error = typeof params.error === "string" ? params.error.slice(0, 180) : "";
  return <div className="mx-auto max-w-xl px-4 py-12 sm:py-20"><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card sm:p-9"><p className="eyebrow">Почти готово</p><h1 className="mt-2 text-3xl font-black tracking-tight">Подтвердите email</h1><p className="mt-3 text-sm leading-6 text-slate-600">Введите шестизначный код из письма{email ? <> для <strong>{email}</strong></> : ""}. Код действует 15 минут.</p>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}{params.sent === "1" && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Если аккаунт ожидает подтверждения, мы отправили новый код.</p>}
    <form action={verifyEmailAction} className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-bold">Email<input className="field" type="email" name="email" required maxLength={254} defaultValue={email}/></label><label className="grid gap-2 text-sm font-bold">Код из письма<input className="field text-center text-2xl tracking-[.4em]" name="code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="one-time-code"/></label><button className="button-primary w-full" type="submit">Подтвердить email</button></form>
    <form action={resendVerificationAction} className="mt-3"><input type="hidden" name="email" value={email}/><button className="button-secondary w-full" type="submit">Отправить код ещё раз</button></form><p className="mt-5 text-center text-sm text-slate-500"><Link className="font-bold text-teal-700" href="/login">Вернуться ко входу</Link></p>
  </section></div>;
}
