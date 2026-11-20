"use client";

import { useState } from "react";
import Link from "next/link";
import { primaryButton, secondaryButton } from "@/components/styles";
import { formatRubles } from "@/lib/catalog";
import { plans, type PlanId } from "@/lib/plans";

export function Pricing() {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const selectedPlan = plans.find((plan) => plan.id === selected);

  return (
    <section id="pricing" className="scroll-mt-24 border-t border-line bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
          06 / Тарифы
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Free, Plus и Pro
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Отметьте тариф, чтобы сравнить его с остальными. Оплата на этом экране не подключена,
          списание не выполняется.
        </p>
        <ul className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const active = selected === plan.id;
            const highlighted = "featured" in plan && plan.featured;
            return (
              <li
                key={plan.id}
                className={`flex flex-col rounded-3xl border p-6 ${
                  highlighted ? "border-navy bg-navy text-white" : "border-line bg-paper text-ink"
                }`}
              >
                <p className={`text-sm font-semibold ${highlighted ? "text-white/80" : "text-accent"}`}>
                  {plan.audience}
                </p>
                <h3 className="mt-3 font-display text-3xl font-semibold">{plan.name}</h3>
                <p className="mt-4">
                  <span className="font-display text-4xl font-semibold">
                    {formatRubles(plan.price)}
                  </span>
                  <span className={`mt-1 block text-sm ${highlighted ? "text-white/75" : "text-muted"}`}>
                    {plan.period}
                  </span>
                </p>
                <ul className="mt-6 space-y-3 text-sm leading-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span
                        aria-hidden="true"
                        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                          highlighted ? "bg-white" : "bg-navy"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  aria-pressed={active}
                  className={`mt-8 w-full ${highlighted ? secondaryButton : primaryButton}`}
                  onClick={() => setSelected((current) => (current === plan.id ? null : plan.id))}
                >
                  {active ? `Снять отметку ${plan.name}` : `Отметить тариф ${plan.name}`}
                </button>
              </li>
            );
          })}
        </ul>
        <p role="status" className="mt-6 text-sm leading-6 text-graphite">
          {selectedPlan
            ? `Тариф «${selectedPlan.name}» отмечен для сравнения. Списание средств не выполняется.`
            : "Тариф пока не отмечен. Кнопка только фиксирует выбор на странице."}
        </p>
        <Link href="/pricing" className={`${secondaryButton} mt-4`}>
          Открыть тарифы
        </Link>
      </div>
    </section>
  );
}
