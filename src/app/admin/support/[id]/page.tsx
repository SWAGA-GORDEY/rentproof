import { Suspense } from "react";
import { dccUpdateTicketAction } from "@/app/actions/dcc";
import { fieldClass, primaryButton } from "@/components/styles";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { getTicket } from "@/lib/support-tickets";

export default function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Ticket…</p>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("support.view");
  const { id } = await params;
  const { ticket, messages } = getTicket(id);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted">
          {ticket.name} · {ticket.email} · {ticket.category} · {ticket.status}
        </p>
      </div>
      <ul className="space-y-3 rounded-3xl border border-line bg-white p-5 text-sm">
        {messages.map((m) => (
          <li key={m.id} className="border-b border-line py-3">
            <p className="font-semibold text-navy">
              {m.display_name || m.author_name}
              {m.internal ? " · internal" : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            <p className="mt-1 text-xs text-muted">{formatDateRu(m.created_at)}</p>
          </li>
        ))}
      </ul>
      <form action={dccUpdateTicketAction} className="grid gap-3 rounded-3xl border border-line bg-white p-5">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <select name="status" defaultValue={ticket.status} className={fieldClass}>
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
        <select name="priority" defaultValue={ticket.priority} className={fieldClass}>
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
        </select>
        <textarea name="message" rows={3} className={fieldClass} placeholder="Ответ" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="internal" value="1" /> Внутренняя заметка
        </label>
        <button type="submit" className={primaryButton}>
          Сохранить
        </button>
      </form>
    </div>
  );
}
