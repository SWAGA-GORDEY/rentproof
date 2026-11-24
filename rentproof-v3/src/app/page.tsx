import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { publicListings } from "@/lib/marketplace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Аренда без сюрпризов" };

const categories = [
  { name: "Инструмент", emoji: "🛠️", caption: "Для ремонта и мастерской", tint: "bg-amber-50" },
  { name: "Техника", emoji: "🚜", caption: "Для стройки и участка", tint: "bg-sky-50" },
  { name: "Для дома", emoji: "🏡", caption: "То, что нужно ненадолго", tint: "bg-emerald-50" },
  { name: "Другое", emoji: "✳️", caption: "Находите редкие вещи", tint: "bg-violet-50" },
];

export default async function HomePage() {
  const listings = await publicListings();
  return (
    <>
      <section className="relative overflow-hidden bg-[#e8f2ec]">
        <div className="hero-grid absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-40 -top-44 size-[34rem] rounded-full bg-[#cdeade] blur-2xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[.13em] text-teal-800"><span className="size-2 rounded-full bg-teal-500" />Платформа аренды вещей</p>
            <h1 className="mt-6 max-w-3xl text-balance text-[2.7rem] font-black leading-[1.02] tracking-[-.055em] text-slate-950 sm:text-6xl lg:text-[4.6rem]">Берите нужное.<br /><span className="text-teal-700">Без лишних покупок.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Инструменты, техника и оборудование рядом. Сравнивайте условия, заранее видьте залог и договаривайтесь о сроках без переписок наугад.</p>
            <form action="/catalog" className="mt-8 flex max-w-xl flex-col gap-2 rounded-[1.25rem] border border-white bg-white p-2 shadow-[0_20px_50px_-30px_rgba(17,43,49,.4)] sm:flex-row">
              <label className="flex min-h-12 flex-1 items-center gap-3 px-3 text-slate-400"><span aria-hidden="true">⌕</span><span className="sr-only">Что ищете</span><input name="q" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" placeholder="Что нужно арендовать?" /></label>
              <button className="button-primary px-6" type="submit">Найти вещь <span aria-hidden="true">→</span></button>
            </form>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"><span>✓ Понятная стоимость</span><span>✓ Условия видны заранее</span><span>✓ Проверка состояния с AI</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[34rem]">
            <div className="absolute -left-5 top-10 hidden h-28 w-28 rounded-full border border-teal-200/80 sm:block" />
            <div className="absolute -right-4 bottom-5 hidden size-24 rounded-[2rem] border border-emerald-300/70 rotate-12 sm:block" />
            <div className="relative rounded-[2rem] border border-white bg-white p-3 shadow-[0_35px_80px_-45px_rgba(17,43,49,.45)] sm:p-4">
              <div className="relative flex min-h-[21rem] items-end overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#d7e9d6] via-[#aacbbd] to-[#91b8aa] p-6 sm:min-h-[26rem] sm:p-8">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 20%,#fff 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,#fff 0 1px,transparent 2px)", backgroundSize: "30px 30px" }} />
                <div className="absolute left-[20%] top-[16%] flex h-40 w-44 rotate-[-8deg] items-center justify-center rounded-[2.5rem] border-[10px] border-[#f9f8e9] bg-gradient-to-br from-[#f5ce6c] to-[#dc9d34] shadow-[0_25px_30px_-15px_rgba(17,43,49,.4)] sm:h-52 sm:w-56"><span className="text-7xl drop-shadow-md sm:text-8xl">🧰</span></div>
                <div className="absolute right-[12%] top-[13%] rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur"><p className="text-[10px] font-extrabold tracking-[.12em] text-teal-700 uppercase">Прозрачные условия</p><p className="mt-1 text-sm font-black text-slate-900">Залог виден сразу</p></div>
                <div className="relative w-full rounded-[1.25rem] bg-white/95 p-4 shadow-soft backdrop-blur sm:p-5">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold tracking-[.14em] text-slate-400 uppercase">Проверенная карточка</p><h2 className="mt-1 text-lg font-black text-slate-950">Найдите нужное рядом</h2></div><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700">✦</span></div>
                  <div className="mt-4 flex items-center gap-3"><div className="flex -space-x-2"><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-orange-100 text-xs">А</span><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-blue-100 text-xs">М</span><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-violet-100 text-xs">И</span></div><p className="text-xs font-semibold text-slate-500">Объявления от людей рядом</p><span className="ml-auto text-sm font-black text-teal-700">→</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Выберите категорию</p><h2 className="section-title">Для любого проекта</h2></div><Link href="/catalog" className="button-secondary">Весь каталог <span aria-hidden="true">→</span></Link></div>
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">{categories.map((category) => <Link key={category.name} href={`/catalog?category=${encodeURIComponent(category.name)}`} className={`group rounded-3xl ${category.tint} p-5 transition hover:-translate-y-1 sm:p-6`}><span className="grid size-12 place-items-center rounded-2xl bg-white text-2xl shadow-soft">{category.emoji}</span><h3 className="mt-5 text-base font-black text-slate-950 sm:text-lg">{category.name}</h3><p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{category.caption}</p></Link>)}</div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Уже рядом</p><h2 className="section-title">Свежие объявления</h2><p className="mt-2 text-sm text-slate-500">Цена и залог указаны в карточке — сравнивайте до заявки.</p></div><Link href="/catalog" className="button-secondary">Открыть каталог <span aria-hidden="true">→</span></Link></div>
          {listings.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.slice(0, 3).map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="mt-8 flex flex-col items-start gap-5 rounded-[1.75rem] border border-dashed border-teal-200 bg-[#f4fbf7] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="text-sm font-extrabold text-slate-950">Каталог ждёт первые объявления</p><p className="mt-1 text-sm text-slate-500">Добавьте оборудование и начните получать заявки на аренду.</p></div><Link href="/register?role=owner" className="button-primary">Разместить вещь <span aria-hidden="true">→</span></Link></div>}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"><div className="max-w-2xl"><p className="eyebrow">Всё по шагам</p><h2 className="section-title">Аренда без догадок</h2><p className="mt-3 leading-7 text-slate-600">Один понятный процесс — от поиска до возврата. Никаких оплат через платформу в этой версии: условия согласуются между людьми напрямую.</p></div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">{[{n:"01",title:"Найдите",text:"Фильтруйте вещи по категории и городу. Сравните стоимость, залог и описание."},{n:"02",title:"Отправьте заявку",text:"Укажите даты аренды. Владелец увидит запрос и подтвердит доступность."},{n:"03",title:"Договоритесь",text:"Обсудите передачу и зафиксируйте состояние предмета до и после аренды."}].map((step)=><article key={step.n} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card"><p className="text-xs font-black tracking-[.15em] text-teal-700">ШАГ {step.n}</p><h3 className="mt-6 text-xl font-black text-slate-950">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p></article>)}</div>
      </section>

      <section id="ai" className="mx-4 mb-16 overflow-hidden rounded-[2rem] bg-[#112b31] text-white sm:mx-6 lg:mx-auto lg:max-w-7xl">
        <div className="grid items-center gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:px-16"><div><p className="text-xs font-extrabold tracking-[.16em] text-teal-300 uppercase">RentProof AI · TokenLavka</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Хорошее объявление начинается с ясного описания</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">AI-помощник подготовит черновик объявления по вашим фактам. Он не придумывает характеристики — финальный текст всегда проверяет владелец.</p></div><Link href="/account/listings/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b6ead8] px-5 py-3 text-sm font-black text-[#112b31] transition hover:bg-white">Создать объявление <span aria-hidden="true">→</span></Link></div>
      </section>
    </>
  );
}
