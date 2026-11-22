import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CatalogCard } from "@/components/catalog-card";
import { PageShell } from "@/components/page-shell";
import { categories, isCategoryId } from "@/lib/categories";
import { searchListings } from "@/lib/listings";
import { pageMetadata } from "@/lib/seo";

type Params = { id: string };

const SEO_BLURBS: Record<string, { lead: string; body: string }> = {
  construction: {
    lead: "Аренда строительного оборудования для площадки и монтажа.",
    body: "В каталоге — оснастка и техника для строительных работ. Сравнивайте цену за сутки, залог и фото состояния до заявки. Визуальная оценка по снимкам помогает зафиксировать видимый износ, но не заменяет осмотр на месте.",
  },
  tools: {
    lead: "Аренда инструмента: ручной и электроинструмент под задачу.",
    body: "Подбирайте шуруповёрты, пилы и другой инструмент по городу и сроку. В карточке указаны условия аренды и материалы о состоянии. Платежи на платформе в демо-режиме не списываются.",
  },
  cars: {
    lead: "Аренда автомобилей для поездок и коммерческих задач.",
    body: "Смотрите легковые и коммерческие машины с ценой, залогом и доступностью. История заявок и отзывы хранятся на сервере после завершения аренды.",
  },
  motorcycles: {
    lead: "Аренда мотоциклов и скутеров.",
    body: "Сравнивайте предложения по городу и сроку. Перед сделкой изучите фото и описание; скрытые неисправности по снимкам установить нельзя.",
  },
  electronics: {
    lead: "Аренда электроники: ноутбуки, звук и приборы.",
    body: "Карточки содержат описание, залог и фото. Визуальная оценка помогает описать видимые признаки, но не подтверждает полную исправность устройства.",
  },
  photo: {
    lead: "Аренда фото- и видеотехники для съёмок.",
    body: "Камеры, свет и оптика с условиями аренды в одной карточке. Уточняйте комплект и состояние у владельца до передачи.",
  },
  appliances: {
    lead: "Аренда бытовой техники для дома и кухни.",
    body: "Выбирайте технику по городу и цене за сутки. Фиксация состояния фотографиями доступна сторонам сделки.",
  },
  sport: {
    lead: "Аренда спортивного оборудования.",
    body: "Инвентарь для тренировок и игр с прозрачными условиями. Сравнивайте предложения в каталоге RentProof до отправки заявки.",
  },
  camping: {
    lead: "Аренда туристического снаряжения.",
    body: "Палатки и снаряжение для выездов. В объявлении указаны город, срок и материалы о состоянии.",
  },
  other: {
    lead: "Аренда имущества вне основных категорий.",
    body: "Предметы, которые не попали в остальные разделы. Изучайте описание и фото; при необходимости запросите дополнительную визуальную оценку.",
  },
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  if (!isCategoryId(id)) {
    return { title: "Категория — RentProof" };
  }
  const category = categories.find((item) => item.id === id)!;
  const blurb = SEO_BLURBS[id];
  return pageMetadata({
    title: `${category.name} — аренда | RentProof`,
    description: blurb?.lead ?? category.description,
    path: `/categories/${id}`,
  });
}

export default function CategoryPage({ params }: { params: Promise<Params> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем категорию…</p>}>
        <Body params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  await connection();
  const { id } = await params;
  if (!isCategoryId(id)) {
    notFound();
  }
  const category = categories.find((item) => item.id === id)!;
  const blurb = SEO_BLURBS[id];
  const result = searchListings({
    q: "",
    category: id,
    city: "",
    minPrice: null,
    maxPrice: null,
    sort: "new",
    availableOnly: false,
    page: 1,
  });

  return (
    <article className="grid gap-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Категория</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-navy">{category.name}</h1>
        <p className="mt-4 text-base leading-7 text-graphite">{blurb?.lead ?? category.description}</p>
        <p className="mt-3 text-sm leading-7 text-muted">{blurb?.body}</p>
      </header>
      <section aria-labelledby="category-listings">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="category-listings" className="font-display text-2xl font-semibold text-navy">
            Объявления в категории
          </h2>
          <Link href={`/catalog?category=${id}`} className="text-sm font-semibold text-navy">
            Открыть в каталоге
          </Link>
        </div>
        {result.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Пока нет опубликованных объявлений в этой категории.</p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((listing) => (
              <li key={listing.id}>
                <CatalogCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
