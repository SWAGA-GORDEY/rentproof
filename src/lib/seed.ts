import type { DatabaseSync } from "node:sqlite";
import { categories } from "@/lib/categories";
import { foldSearch } from "@/lib/format";

export const DEMO_OWNER_ID = "demo-owner";

const DEMO_PASSWORD_HASH =
  "scrypt$32768$8$1$dEPb6mqjenWTYGUzncVvHw$nguUD0IKUSmrSYQEG2lAUaSs7CQFRN8jM-d6uIMory1If9_cwRVbRBtclVs7yeK9tvtkYqPV7mXSw0Wwr4uCTg";

const DEMO_LISTINGS = [
  {
    id: "demo-excavator",
    categoryId: "construction",
    title: "Экскаватор-погрузчик для коротких работ",
    city: "Казань",
    price: 18500,
    deposit: 80000,
    description:
      "Демонстрационное объявление. Машина для коротких земляных циклов в городе. В комплекте ковш и штатный комплект документов владельца. Это пример карточки, а не живое предложение площадки.",
    notes: "Владелец отмечает рабочий износ ковша. Это не отчёт AI.",
    specs: [
      { label: "Тип", value: "Экскаватор-погрузчик" },
      { label: "Подача", value: "По Казани, отдельно" },
    ],
  },
  {
    id: "demo-drill",
    categoryId: "tools",
    title: "Аккумуляторный шуруповёрт с двумя батареями",
    city: "Москва",
    price: 700,
    deposit: 4000,
    description:
      "Демонстрационное объявление. Комплект для монтажа: шуруповёрт, две батареи и зарядное устройство. Подходит как пример карточки инструмента.",
    notes: "Следы использования на корпусе, по словам владельца.",
    specs: [
      { label: "Питание", value: "Аккумулятор" },
      { label: "Комплект", value: "Две батареи" },
    ],
  },
  {
    id: "demo-car",
    categoryId: "cars",
    title: "Городской автомобиль на выходные",
    city: "Екатеринбург",
    price: 4200,
    deposit: 20000,
    description:
      "Демонстрационное объявление. Легковой автомобиль для короткой поездки. Лимит пробега и топливо описываются в условиях и не включают страховку арендатора.",
    notes: "Небольшая царапина на бампере указана владельцем заранее.",
    specs: [
      { label: "Пробег", value: "200 км в сутки" },
      { label: "Топливо", value: "Полный бак при возврате" },
    ],
  },
  {
    id: "demo-moto",
    categoryId: "motorcycles",
    title: "Мотоцикл для городской поездки",
    city: "Сочи",
    price: 3500,
    deposit: 25000,
    description:
      "Демонстрационное объявление. Мотоцикл выдаётся при наличии прав нужной категории. Карточка показывает, как выглядит предложение в каталоге.",
    notes: "Сезонная эксплуатация, косметические следы.",
    specs: [{ label: "Экипировка", value: "Шлем по размеру" }],
  },
  {
    id: "demo-camera",
    categoryId: "photo",
    title: "Камера для репортажа с клеткой",
    city: "Санкт-Петербург",
    price: 6400,
    deposit: 50000,
    description:
      "Демонстрационное объявление. Камера, клетка и две батареи. Оптика в стоимость не входит. Карточка нужна, чтобы каталог не был пустым.",
    notes: "Корпус без трещин, по описанию владельца.",
    specs: [
      { label: "Питание", value: "Две батареи" },
      { label: "Оптика", value: "Не входит" },
    ],
  },
  {
    id: "demo-tent",
    categoryId: "camping",
    title: "Палатка на четверых",
    city: "Новосибирск",
    price: 900,
    deposit: 3000,
    description:
      "Демонстрационное объявление. Туристическая палатка с тентом. Перед выдачей стороны сверяют комплект колышков и дуг.",
    notes: "Тент без крупных порезов, по словам владельца.",
    specs: [{ label: "Вместимость", value: "4 человека" }],
  },
] as const;

export function seed(db: DatabaseSync): void {
  const upsertCategory = db.prepare(
    `INSERT INTO categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, sort_order = excluded.sort_order`,
  );
  categories.forEach((category, index) => {
    upsertCategory.run(category.id, category.name, category.description, index);
  });

  const now = "2026-11-20T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at, is_admin, plan)
     VALUES (?, 'demo-owner@rentproof.invalid', ?, 'Демонстрационный арендодатель', 'landlord', NULL, 'Москва', ?, ?, 0, 'free')
     ON CONFLICT(id) DO NOTHING`,
  ).run(DEMO_OWNER_ID, DEMO_PASSWORD_HASH, now, now);

  const insertListing = db.prepare(
    `INSERT INTO listings (
      id, owner_id, category_id, title, description, city, price_per_day, deposit, min_days,
      condition_score, condition_notes, specs_json, status, available_from, available_to, bookable, is_demo, search_text, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, 'published', NULL, NULL, 1, 1, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`,
  );
  for (const listing of DEMO_LISTINGS) {
    insertListing.run(
      listing.id,
      DEMO_OWNER_ID,
      listing.categoryId,
      listing.title,
      listing.description,
      listing.city,
      listing.price,
      listing.deposit,
      listing.notes,
      JSON.stringify(listing.specs),
      foldSearch(listing.title, listing.description, listing.city),
      now,
      now,
    );
  }

  const blank = db.prepare("SELECT id, title, description, city FROM listings WHERE search_text = ''").all() as Array<{
    id: string;
    title: string;
    description: string;
    city: string;
  }>;
  const fill = db.prepare("UPDATE listings SET search_text = ? WHERE id = ?");
  for (const row of blank) {
    fill.run(foldSearch(row.title, row.description, row.city), row.id);
  }
}
