import { PageShell } from "@/components/page-shell";
import { ContactForm } from "@/components/simple-forms";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Контакты",
  description: "Связь с командой RentProof. Сообщение сохраняется на сервере; письмо уходит только после настройки почты.",
  path: "/contacts",
});

export default function ContactsPage() {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-xl gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold text-navy">Контакты</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Форма сохраняет сообщение в базе и, если есть администратор, создаёт внутреннее уведомление. Исходящая почта не имитируется.</p>
        </div>
        <ContactForm />
      </div>
    </PageShell>
  );
}
