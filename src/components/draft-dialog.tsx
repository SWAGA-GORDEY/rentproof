"use client";

import { useEffect, useId, useRef, useState } from "react";
import { primaryButton, secondaryButton } from "@/components/styles";
import { categories, isCategoryId, type CategoryId, type Listing } from "@/lib/catalog";

type DraftDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (listing: Listing) => void;
};

type FormErrors = {
  title?: string;
  category?: string;
  city?: string;
  price?: string;
  summary?: string;
};

export function DraftDialog({ open, onClose, onCreate }: DraftDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const firstField = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [summary, setSummary] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstField.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function clearError(field: keyof FormErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit() {
    const nextErrors: FormErrors = {};
    const trimmedTitle = title.trim();
    const trimmedCity = city.trim();
    const trimmedSummary = summary.trim();
    const priceValue = Number(price);

    if (trimmedTitle.length < 3) {
      nextErrors.title = "Название нужно от 3 символов";
    }
    if (!isCategoryId(category)) {
      nextErrors.category = "Выберите категорию";
    }
    if (trimmedCity.length < 2) {
      nextErrors.city = "Укажите город";
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0 || priceValue > 10_000_000) {
      nextErrors.price = "Укажите цену за сутки больше нуля";
    }
    if (trimmedSummary.length < 10) {
      nextErrors.summary = "Описание нужно от 10 символов";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !isCategoryId(category)) {
      return;
    }

    const listing: Listing = {
      id: `draft-${crypto.randomUUID()}`,
      title: trimmedTitle,
      category: category as CategoryId,
      city: trimmedCity,
      pricePerDay: Math.round(priceValue),
      deposit: 0,
      minDays: 1,
      condition: 0,
      summary: trimmedSummary,
      terms: [
        "Черновик хранится в этой вкладке браузера",
        "На сервер объявление не отправляется",
        "Залог можно будет указать при публикации",
      ],
      draft: true,
    };

    setTitle("");
    setCategory("");
    setCity("");
    setPrice("");
    setSummary("");
    setErrors({});
    onCreate(listing);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-navy-deep/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-line bg-white p-5 shadow-2xl sm:p-7"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key !== "Tab") {
            return;
          }
          const items = event.currentTarget.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          const focusable = Array.from(items).filter((item) => !item.hasAttribute("disabled"));
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) {
            return;
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Новое объявление</p>
        <h2 id={titleId} className="mt-2 font-display text-2xl font-semibold text-navy">
          Разместить объявление
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
          Черновик появится в каталоге этой вкладки. На сервер он не отправляется.
        </p>
        <form
          className="mt-6 grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Название
            <input
              ref={firstField}
              value={title}
              maxLength={80}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "draft-title-error" : undefined}
              onChange={(event) => {
                setTitle(event.target.value);
                clearError("title");
              }}
              className="rounded-xl border border-line px-3 py-3 font-normal outline-none focus:border-navy"
              placeholder="Например, генератор 6 кВт"
            />
            {errors.title ? (
              <span id="draft-title-error" className="font-normal text-accent">
                {errors.title}
              </span>
            ) : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Категория
              <select
                value={category}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? "draft-category-error" : undefined}
                onChange={(event) => {
                  setCategory(event.target.value);
                  clearError("category");
                }}
                className="rounded-xl border border-line bg-white px-3 py-3 font-normal outline-none focus:border-navy"
              >
                <option value="">Выберите</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <span id="draft-category-error" className="font-normal text-accent">
                  {errors.category}
                </span>
              ) : null}
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Город
              <input
                value={city}
                maxLength={40}
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? "draft-city-error" : undefined}
                onChange={(event) => {
                  setCity(event.target.value);
                  clearError("city");
                }}
                className="rounded-xl border border-line px-3 py-3 font-normal outline-none focus:border-navy"
                placeholder="Москва"
              />
              {errors.city ? (
                <span id="draft-city-error" className="font-normal text-accent">
                  {errors.city}
                </span>
              ) : null}
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Цена за сутки, ₽
            <input
              value={price}
              inputMode="numeric"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? "draft-price-error" : undefined}
              onChange={(event) => {
                setPrice(event.target.value.replace(/[^\d]/g, ""));
                clearError("price");
              }}
              className="rounded-xl border border-line px-3 py-3 font-normal outline-none focus:border-navy"
              placeholder="3500"
            />
            {errors.price ? (
              <span id="draft-price-error" className="font-normal text-accent">
                {errors.price}
              </span>
            ) : null}
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            Краткое описание
            <textarea
              value={summary}
              maxLength={400}
              rows={4}
              aria-invalid={Boolean(errors.summary)}
              aria-describedby={errors.summary ? "draft-summary-error" : undefined}
              onChange={(event) => {
                setSummary(event.target.value);
                clearError("summary");
              }}
              className="resize-y rounded-xl border border-line px-3 py-3 font-normal outline-none focus:border-navy"
              placeholder="Что входит в комплект и для каких работ предмет подходит"
            />
            {errors.summary ? (
              <span id="draft-summary-error" className="font-normal text-accent">
                {errors.summary}
              </span>
            ) : null}
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Закрыть
            </button>
            <button type="submit" className={primaryButton}>
              Добавить черновик в каталог
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
