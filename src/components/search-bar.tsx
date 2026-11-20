"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { categories, isCategoryId } from "@/lib/categories";
import { primaryButton } from "@/components/styles";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedQuery = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const appliedCategory = isCategoryId(categoryParam) ? categoryParam : "";

  const [query, setQuery] = useState(appliedQuery);
  const [category, setCategory] = useState(appliedCategory);
  const [querySource, setQuerySource] = useState(appliedQuery);
  const [categorySource, setCategorySource] = useState(appliedCategory);

  if (querySource !== appliedQuery) {
    setQuerySource(appliedQuery);
    setQuery(appliedQuery);
  }

  if (categorySource !== appliedCategory) {
    setCategorySource(appliedCategory);
    setCategory(appliedCategory);
  }

  return (
    <form
      role="search"
      aria-label="Поиск объявлений"
      className="rounded-2xl border border-line bg-white p-2 shadow-[0_18px_40px_-28px_rgba(12,35,64,0.55)]"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set("q", query.trim());
        }
        if (isCategoryId(category)) {
          params.set("category", category);
        }
        const search = params.toString();
        router.push(search ? `/catalog?${search}` : "/catalog");
      }}
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_16rem_auto] md:items-end">
        <label className="block px-2 py-1">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Запрос
          </span>
          <input
            name="q"
            value={query}
            maxLength={80}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Техника, инструмент, площадка"
            className="mt-1 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted/80"
          />
        </label>
        <label className="block border-t border-line px-2 py-1 md:border-t-0 md:border-l">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Категория
          </span>
          <select
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full bg-transparent text-base text-ink outline-none"
          >
            <option value="">Все категории</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${primaryButton} w-full md:w-auto md:self-stretch md:px-6`}>
          Найти
        </button>
      </div>
    </form>
  );
}
