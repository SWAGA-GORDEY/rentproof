import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ListingEditor } from "@/components/listing-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новое объявление" };

export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if (user.role === "tenant") return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="text-2xl font-black">Включите режим арендодателя</h1><p className="mt-3 text-sm text-slate-500">Из личного кабинета можно включить размещение своих вещей.</p><Link href="/account" className="button-primary mt-5">В кабинет</Link></div>;
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const aiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.TOKENLAVKA_KEY?.trim() || process.env.TOKENLAVKA_API_KEY?.trim());
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14"><Link href="/account/listings" className="text-sm font-bold text-slate-500">← К объявлениям</Link><section className="mt-5 rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-card sm:p-8"><p className="eyebrow">Для арендодателя</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Новое объявление</h1><p className="mt-2 text-sm leading-6 text-slate-500">Сначала мы проверим объявление. После одобрения оно появится в каталоге.</p><div className="mt-7"><ListingEditor aiConfigured={aiConfigured} error={error}/></div></section></div>;
}
