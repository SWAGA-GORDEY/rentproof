"use client";

import { CategoryIcon } from "@/components/icons";
import { categories, type CategoryId } from "@/lib/catalog";

type CategoryGridProps = {
  active: string;
  onSelect: (category: CategoryId | "") => void;
};

export function CategoryGrid({ active, onSelect }: CategoryGridProps) {
  return (
    <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => {
        const selected = active === category.id;
        return (
          <li key={category.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? "" : category.id)}
              className={`flex h-full w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                selected
                  ? "border-navy bg-white shadow-[0_12px_30px_-24px_rgba(12,35,64,0.8)]"
                  : "border-line bg-white hover:border-navy/30"
              }`}
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-navy">
                <CategoryIcon category={category.id} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{category.name}</span>
                <span className="mt-1 block text-sm leading-5 text-muted">{category.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
