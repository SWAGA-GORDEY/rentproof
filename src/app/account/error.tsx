"use client";

import Link from "next/link";
import { secondaryButton } from "@/components/styles";

export default function AccountError() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Не удалось открыть кабинет</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Обновите страницу. Если ошибка повторится, войдите снова. Подробности сбоя на экран не выводятся.
      </p>
      <Link href="/login" className={`${secondaryButton} mt-6 self-start`}>
        Перейти ко входу
      </Link>
    </div>
  );
}
