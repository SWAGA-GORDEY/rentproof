const zones = [
  { name: "Стрела", note: "Рабочие следы, трещин нет", score: 84 },
  { name: "Люлька", note: "Ограждение целое", score: 91 },
  { name: "Гидравлика", note: "Подтёков не отмечено", score: 88 },
  { name: "Шины", note: "Износ в рабочем допуске", score: 80 },
];

const steps = [
  {
    index: "01",
    title: "Снимки и описание",
    text: "Владелец прикладывает фото узлов и коротко пишет, для каких работ предмет сдаётся.",
  },
  {
    index: "02",
    title: "Разбор по зонам",
    text: "Износ читается отдельно: корпус, рабочие органы, гидравлика, колёса или отделка зала.",
  },
  {
    index: "03",
    title: "Балл в карточке",
    text: "Арендатор видит общий балл и замечания до выдачи, а не после спора.",
  },
];

export function AiAssessment() {
  return (
    <section id="assessment" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            05 / Доверие
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance text-navy sm:text-4xl">
            ИИ-оценка состояния имущества
          </h2>
          <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
            Оценка собирает состояние по зонам и кладёт его в досье. Так обе стороны видят износ
            до передачи, а не только рекламное описание.
          </p>
          <ol className="mt-8 space-y-5">
            {steps.map((step) => (
              <li key={step.index} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                <span className="font-display text-sm font-semibold text-accent">{step.index}</span>
                <span>
                  <span className="block font-semibold text-ink">{step.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <article className="rounded-3xl border border-line bg-white p-6 shadow-[0_20px_40px_-32px_rgba(12,35,64,0.55)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
                Образец отчёта
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-navy">Автовышка 22 метра</h3>
            </div>
            <p className="rounded-2xl bg-mist px-4 py-3 text-right">
              <span className="block text-xs text-muted">Общий балл</span>
              <span className="font-display text-3xl font-semibold text-navy">87</span>
            </p>
          </div>
          <ul className="mt-6 space-y-4">
            {zones.map((zone) => (
              <li key={zone.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{zone.name}</p>
                  <p className="font-display text-sm font-semibold text-navy">{zone.score}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{zone.note}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
                  <div className="h-full bg-navy" style={{ width: `${zone.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-6 text-graphite">
            Пригоден к аренде при допуске оператора и осмотре люльки до смены.
          </p>
          <p className="mt-4 text-xs leading-5 text-muted">
            Это образец отчёта в интерфейсе. Запрос к модели отсюда не отправляется.
          </p>
        </article>
      </div>
    </section>
  );
}
