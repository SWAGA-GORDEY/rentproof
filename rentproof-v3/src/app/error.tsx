"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="eyebrow">Временная ошибка</p><h1 className="mt-3 text-3xl font-black text-slate-950">Не удалось загрузить страницу</h1><p className="mt-3 text-sm leading-6 text-slate-500">Обновите страницу. Если проблема повторяется, попробуйте позже.</p><button className="button-primary mt-6" onClick={reset}>Попробовать снова</button></div>;
}
