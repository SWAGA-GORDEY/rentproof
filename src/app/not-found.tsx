import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { primaryButton } from "@/components/styles";

export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto max-w-xl py-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-navy">Страница не найдена</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Проверьте адрес или вернитесь в каталог.</p>
        <Link href="/catalog" className={`${primaryButton} mt-6`}>К каталогу</Link>
      </div>
    </PageShell>
  );
}
