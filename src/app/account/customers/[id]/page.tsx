import { Suspense } from "react";
import { notFound } from "next/navigation";
import { addCustomerNoteAction, archiveCustomerAction, updateCustomerAction } from "@/app/actions/customers";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { getCustomer, listCustomerInteractions } from "@/lib/customers";
import { requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";

type Params = { id: string };

export const metadata = { title: "Клиент" };

export default function CustomerDetailPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем…</p>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  const user = await requireUser();
  const { id } = await params;
  const customer = getCustomer(user.id, id);
  if (!customer) notFound();
  const interactions = listCustomerInteractions(user.id, id);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">{customer.name}</h1>
        <p className="mt-2 text-sm text-muted">Обновлён {formatDateRu(customer.updatedAt)}</p>
      </div>
      <form action={updateCustomerAction} className="grid gap-3 rounded-3xl border border-line bg-white p-5">
        <input type="hidden" name="customerId" value={customer.id} />
        <input className={fieldClass} name="name" defaultValue={customer.name} required />
        <input className={fieldClass} name="phone" defaultValue={customer.phone ?? ""} placeholder="Телефон" />
        <input className={fieldClass} name="email" type="email" defaultValue={customer.email ?? ""} placeholder="Email" />
        <textarea className={fieldClass} name="notes" defaultValue={customer.notes ?? ""} rows={3} placeholder="Заметки" />
        <button className={primaryButton} type="submit">
          Сохранить
        </button>
      </form>
      <form action={addCustomerNoteAction} className="grid gap-3 rounded-3xl border border-line bg-white p-5">
        <input type="hidden" name="customerId" value={customer.id} />
        <h2 className="font-display text-xl font-semibold text-navy">История взаимодействий</h2>
        <textarea className={fieldClass} name="body" rows={3} placeholder="Новая заметка" required />
        <button className={secondaryButton} type="submit">
          Добавить запись
        </button>
        <ul className="space-y-3 text-sm">
          {interactions.map((item) => (
            <li key={item.id} className="rounded-2xl bg-mist/60 p-3">
              <p className="text-xs text-muted">{formatDateRu(item.created_at)} · {item.kind}</p>
              <p className="mt-1 text-ink">{item.body}</p>
            </li>
          ))}
        </ul>
      </form>
      <form action={archiveCustomerAction}>
        <input type="hidden" name="customerId" value={customer.id} />
        <button className={secondaryButton} type="submit">
          Архивировать клиента
        </button>
      </form>
    </div>
  );
}
