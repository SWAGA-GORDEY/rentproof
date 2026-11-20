"use client";

import Link from "next/link";
import { secondaryButton } from "@/components/styles";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-navy">Не удалось открыть страницу</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Подробности сбоя на экран не выводятся. Повторите действие или вернитесь на главную.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" className={secondaryButton} onClick={() => reset()}>Повторить</button>
        <Link href="/" className={secondaryButton}>На главную</Link>
      </div>
    </div>
  );
}
