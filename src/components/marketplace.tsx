"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CategoryGrid } from "@/components/category-grid";
import { DraftDialog } from "@/components/draft-dialog";
import { ListingCard } from "@/components/listing-card";
import { PlaceListingLink } from "@/components/place-listing-link";
import { secondaryButton } from "@/components/styles";
import {
  buildCatalogHref,
  categoryName,
  isCategoryId,
  listingMatches,
  listings,
  type CategoryId,
  type Listing,
} from "@/lib/catalog";
import { parseDrafts, readDraftSnapshot, subscribeDrafts, writeDrafts } from "@/lib/drafts";

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function readHash() {
  return window.location.hash;
}

export function Marketplace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const categoryParam = searchParams.get("category");
  const category = isCategoryId(categoryParam) ? categoryParam : "";
  const draftSnapshot = useSyncExternalStore(subscribeDrafts, readDraftSnapshot, () => "");
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const drafts = useMemo(() => parseDrafts(draftSnapshot || null), [draftSnapshot]);
  const [notice, setNotice] = useState("");
  const draftOpen = hash === "#razmestit";

  const catalog = [...drafts, ...listings];
  const visible = catalog.filter((listing) => listingMatches(listing, query, category));

  function applyCategory(nextCategory: CategoryId | "") {
    router.push(buildCatalogHref(query, nextCategory), { scroll: false });
  }

  function resetFilters() {
    router.push("/", { scroll: false });
  }

  function closeDraft() {
    if (window.location.hash !== "#razmestit") {
      return;
    }
    window.history.replaceState(null, "", buildCatalogHref(query, category));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function addDraft(listing: Listing) {
    try {
      writeDrafts([listing, ...drafts].slice(0, 20));
    } catch {
      setNotice("Браузер не сохранил черновик, поэтому он не добавлен в каталог.");
      return;
    }
    setNotice(`Черновик «${listing.title}» добавлен в каталог этой вкладки.`);
    const href = buildCatalogHref("", listing.category);
    router.push(href, { scroll: false });
    window.history.replaceState(null, "", href);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.requestAnimationFrame(() => {
      document.getElementById("catalog")?.scrollIntoView({ block: "start" });
    });
  }

  function removeDraft(id: string) {
    try {
      writeDrafts(drafts.filter((item) => item.id !== id));
      setNotice("Черновик убран из каталога этой вкладки.");
    } catch {
      setNotice("Не удалось убрать черновик из памяти вкладки.");
    }
  }

  return (
    <>
      <section id="categories" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            02 / Категории
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance text-navy sm:text-4xl">
            Оборудование, техника и имущество
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Выберите категорию, чтобы оставить в каталоге только нужные карточки.
          </p>
          <CategoryGrid active={category} onSelect={applyCategory} />
        </div>
      </section>

      <section id="catalog" className="scroll-mt-24 pb-16 sm:pb-20">
        <div id="razmestit" className="scroll-mt-24" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
                03 / Каталог
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
                Объявления
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                Примеры объявлений для просмотра каталога. Своё объявление можно добавить
                черновиком в эту вкладку.
              </p>
            </div>
            <PlaceListingLink />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-graphite" role="status">
              Показано {visible.length} из {catalog.length}
              {category ? ` · ${categoryName(category)}` : ""}
              {query ? ` · запрос «${query}»` : ""}
            </p>
            {category || query ? (
              <button type="button" className={secondaryButton} onClick={resetFilters}>
                Сбросить фильтр
              </button>
            ) : null}
          </div>

          {notice ? (
            <p role="status" className="mt-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink">
              {notice}
            </p>
          ) : null}

          {visible.length > 0 ? (
            <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((listing) => (
                <li key={listing.id}>
                  <ListingCard
                    listing={listing}
                    onRemove={listing.draft ? removeDraft : undefined}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
              <p className="font-display text-2xl font-semibold text-navy">Ничего не найдено</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
                Измените запрос или снимите категорию. Фильтр смотрит только карточки на этой странице.
              </p>
              <button type="button" className={`${secondaryButton} mt-6`} onClick={resetFilters}>
                Сбросить фильтр
              </button>
            </div>
          )}
        </div>
      </section>

      <DraftDialog open={draftOpen} onClose={closeDraft} onCreate={addDraft} />
    </>
  );
}

export function MarketplaceFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="h-8 w-48 rounded-lg bg-white" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}
