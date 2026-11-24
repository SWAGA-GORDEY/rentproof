"use client";

import { useState } from "react";
import { createListingAction } from "@/app/actions";

export function ListingEditor({ aiConfigured, error }: { aiConfigured: boolean; error?: string }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Инструмент");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  async function draftDescription() {
    setBusy(true);
    setAiMessage("");
    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, city, notes: description }),
      });
      const data = await response.json() as { draft?: string; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "Не удалось создать описание.");
      setDescription(data.draft);
      setAiMessage("Черновик готов — проверьте факты перед публикацией.");
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "AI временно недоступен.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={createListingAction} className="grid gap-5">
      {error && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}
      <label className="grid gap-2 text-sm font-bold text-slate-700">Название<input required minLength={5} maxLength={100} name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, перфоратор Bosch GBH 2-28" className="field" /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Категория<select className="field" name="category" value={category} onChange={(e) => setCategory(e.target.value)}><option>Инструмент</option><option>Техника</option><option>Для дома</option><option>Другое</option></select></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Город<input required minLength={2} maxLength={80} name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Екатеринбург" className="field" /></label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Цена за день, ₽<input required type="number" min="1" max="10000000" name="price" className="field" placeholder="1500" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Залог, ₽<input required type="number" min="0" max="100000000" name="deposit" className="field" placeholder="5000" /></label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Описание
        <textarea required minLength={30} maxLength={3000} rows={6} name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опишите состояние, комплектацию и условия передачи…" className="field resize-y" />
      </label>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={draftDescription} disabled={!aiConfigured || busy || title.trim().length < 3} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-extrabold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <span className="animate-pulse">Создаём черновик…</span> : <><span>✦</span> Помочь с описанием</>}</button>
        <span aria-live="polite" className="text-xs leading-5 text-slate-500">{aiMessage || (aiConfigured ? "AI предложит черновик — решение о фактах за вами." : "AI-помощник включится после настройки ключа на сервере.")}</span>
      </div>
      <button className="button-primary mt-2" type="submit">Отправить на проверку <span aria-hidden="true">→</span></button>
    </form>
  );
}
