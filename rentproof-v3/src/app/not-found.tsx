import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="eyebrow">404 · Страница не найдена</p><h1 className="mt-3 text-4xl font-black text-slate-950">Здесь пока пусто</h1><p className="mt-3 text-sm leading-6 text-slate-500">Ссылка могла устареть или объявление уже снято.</p><Link href="/catalog" className="button-primary mt-6">Вернуться в каталог</Link></div>;
}
