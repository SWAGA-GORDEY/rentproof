"use client";

import { useEffect, useState } from "react";
import { ListingArt } from "@/components/listing-art";
import { PinIcon } from "@/components/icons";
import { quietButton, secondaryButton } from "@/components/styles";
import {
  categoryName,
  formatDays,
  formatRubles,
  type Listing,
} from "@/lib/catalog";

type ListingCardProps = {
  listing: Listing;
  onRemove?: (id: string) => void;
};

export function ListingCard({ listing, onRemove }: ListingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyTerms() {
    const lines = [
      listing.title,
      `${listing.city}, ${categoryName(listing.category)}`,
      `${formatRubles(listing.pricePerDay)} за сутки`,
      listing.deposit > 0 ? `Залог: ${formatRubles(listing.deposit)}` : "Залог не указан",
      `Минимум: ${formatDays(listing.minDays)}`,
      listing.condition > 0 ? `Состояние: ${listing.condition} из 100` : "Оценка не указана",
      listing.summary,
      ...listing.terms,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyError(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:border-navy/25">
      <ListingArt category={listing.category} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">
            {categoryName(listing.category)}
          </p>
          <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold tracking-wide text-graphite uppercase">
            {listing.draft ? "Черновик" : "Пример"}
          </span>
        </div>
        <h3 className="mt-3 font-display text-xl leading-snug font-semibold text-balance text-navy">
          {listing.title}
        </h3>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-graphite">
          <PinIcon className="h-4 w-4 text-accent" />
          {listing.city}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{listing.summary}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <p>
            <span className="font-display text-2xl font-semibold text-navy">
              {formatRubles(listing.pricePerDay)}
            </span>
            <span className="mt-1 block text-xs text-muted">за сутки</span>
          </p>
          <p className="text-right">
            <span className="block text-xs text-muted">Состояние</span>
            <span className="font-display text-lg font-semibold text-ink">
              {listing.condition > 0 ? listing.condition : "—"}
            </span>
          </p>
        </div>
        {listing.condition > 0 ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
            <div className="h-full bg-navy" style={{ width: `${listing.condition}%` }} />
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">Оценка в черновике не указана</p>
        )}
        <button
          type="button"
          className={`${secondaryButton} mt-5 w-full`}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Скрыть условия" : "Смотреть условия"}
        </button>
        {expanded ? (
          <div className="mt-4 border-t border-line pt-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Залог</dt>
                <dd className="font-semibold text-ink">
                  {listing.deposit > 0 ? formatRubles(listing.deposit) : "Не указан"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Минимум</dt>
                <dd className="font-semibold text-ink">{formatDays(listing.minDays)}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-graphite">
              {listing.terms.map((term) => (
                <li key={term} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                  <span>{term}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" className={`${quietButton} justify-start px-0`} onClick={copyTerms}>
                {copied ? "Условия скопированы" : "Скопировать условия"}
              </button>
              {copyError ? (
                <p className="text-sm text-graphite" role="status">
                  Не удалось скопировать. Выделите текст условий вручную.
                </p>
              ) : null}
              {listing.draft && onRemove ? (
                <button
                  type="button"
                  className={`${quietButton} justify-start px-0 text-graphite`}
                  onClick={() => onRemove(listing.id)}
                >
                  Убрать черновик из каталога
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
