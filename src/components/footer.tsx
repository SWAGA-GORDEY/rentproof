import Link from "next/link";
import { Logo } from "@/components/logo";
import { PlaceListingLink } from "@/components/place-listing-link";
import { footerLinks } from "@/lib/navigation";

export function Footer() {
  return (
    <footer className="bg-navy-deep text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.8fr)]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
            Аренда оборудования, техники и имущества. В карточке собраны цена, залог и состояние.
          </p>
        </div>
        <nav aria-label="Разделы в подвале">
          <p className="text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">Разделы</p>
          <ul className="mt-4 space-y-2">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-white/85 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">Сделка</p>
          <ul className="mt-4 space-y-2 text-sm text-white/85">
            <li>
              <Link href="/catalog" className="transition hover:text-white">
                Смотреть объявления
              </Link>
            </li>
            <li>
              <PlaceListingLink className="text-sm text-white/85 transition hover:text-white">Разместить объявление</PlaceListingLink>
            </li>
            <li>
              <Link href="/ai-assessment" className="transition hover:text-white">
                Запустить визуальную оценку
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60 sm:px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          © 2026 RentProof. Расчёты и тарифы демонстрационные, платежи не списываются.
        </p>
      </div>
    </footer>
  );
}
