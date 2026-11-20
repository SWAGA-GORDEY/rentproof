const benefits = [
  {
    index: "01",
    title: "Одно досье на предмет",
    text: "Фото, замечания и условия собраны в карточке. Их не нужно собирать по переписке.",
  },
  {
    index: "02",
    title: "Сравнение до сделки",
    text: "Цена за сутки, залог и минимальный срок стоят рядом, ещё до передачи имущества.",
  },
  {
    index: "03",
    title: "Категории по делу",
    text: "Техника, инструмент, транспорт, площадки и спецтехника разложены по понятным разделам.",
  },
  {
    index: "04",
    title: "Тариф с пределом",
    text: "Free, Plus и Pro отличаются числом объявлений и составом карточки, без скрытого шага.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="scroll-mt-24 border-y border-line bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
          04 / Преимущества
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance text-navy sm:text-4xl">
          Платформа, где условия видны заранее
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          RentProof строится вокруг доверия к сделке: арендатор и владелец смотрят одно и то же досье.
        </p>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit.index} className="rounded-2xl border border-line bg-paper p-6">
              <p className="font-display text-sm font-semibold tracking-[0.14em] text-accent">
                {benefit.index}
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-navy">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-6 text-graphite sm:text-base">{benefit.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
