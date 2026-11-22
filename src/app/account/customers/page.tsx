import { Suspense } from "react";
import Link from "next/link";
import { createCustomerAction } from "@/app/actions/customers";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { countCustomers, listCustomers } from "@/lib/customers";
import { requireUser } from "@/lib/current-user";
import { planCustomerLimit } from "@/lib/plans";
import { readPlan } from "@/lib/subscriptions";

export const metadata = { title: "Клиенты" };

export default function CustomersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем клиентов…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  if (!user.emailVerified) {
    return (
      <p className="text-sm text-muted">
        Сначала подтвердите email. <Link href="/verify-email" className="font-semibold text-navy">Перейти</Link>
      </p>
    );
  }
  const plan = readPlan(user.id);
  const used = countCustomers(user.id);
  const limit = planCustomerLimit(plan);
  const customers = listCustomers(user.id);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Клиенты</h1>
        <p className="mt-2 text-sm text-muted">
          Ваша база контактов. Лимит тарифа {plan.toUpperCase()}: {used} / {limit}.
        </p>
      </div>
      <form action={createCustomerAction} className="grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-2">
        <h2 className="font-display text-xl font-semibold text-navy md:col-span-2">Новый клиент</h2>
        <input className={fieldClass} name="name" placeholder="Имя" required />
        <input className={fieldClass} name="phone" placeholder="Телефон" />
        <input className={fieldClass} name="email" type="email" placeholder="Email" />
        <input className={fieldClass} name="notes" placeholder="Заметка" />
        <button className={primaryButton} type="submit">
          Добавить
        </button>
      </form>
      <ul className="grid gap-3">
        {customers.length === 0 ? (
          <li className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Пока нет клиентов.</li>
        ) : (
          customers.map((customer) => (
            <li key={customer.id} className="rounded-3xl border border-line bg-white p-5">
              <p className="font-semibold text-ink">{customer.name}</p>
              <p className="text-sm text-muted">
                {[customer.phone, customer.email].filter(Boolean).join(" · ") || "Контакты не указаны"}
              </p>
              <Link href={`/account/customers/${customer.id}`} className={`${secondaryButton} mt-3`}>
                Открыть
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
