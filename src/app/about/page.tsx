import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "О платформе",
  description:
    "RentProof — каталог аренды оборудования и техники с фото, залогом и визуальной оценкой состояния.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <PageShell>
      <article className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-navy">О RentProof</h1>
        <p className="mt-4 text-base leading-7 text-graphite">
          RentProof помогает находить и сравнивать предложения по аренде оборудования, строительной техники, инструмента и
          другого имущества. В карточке видны цена за сутки, залог, город, характеристики и материалы о состоянии до отправки заявки.
        </p>
        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Что есть на платформе</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-graphite">
          <li>Публичный каталог с фильтрами по категории и городу.</li>
          <li>Модерация объявлений перед публикацией.</li>
          <li>Заявки, отзывы и фиксация состояния фотографиями в кабинете.</li>
          <li>Серверная визуальная оценка загруженных снимков — без подмены экспертизы.</li>
        </ul>
        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Честные ограничения</h2>
        <p className="mt-3 text-base leading-7 text-graphite">
          Визуальная оценка по фотографии не подтверждает исправность и не заменяет осмотр. Демонстрационные объявления отмечены
          отдельно. Платежи в этой версии не проводятся. Подробности — в{" "}
          <Link href="/terms" className="font-semibold text-navy">
            соглашении
          </Link>{" "}
          и{" "}
          <Link href="/privacy" className="font-semibold text-navy">
            политике конфиденциальности
          </Link>
          .
        </p>
      </article>
    </PageShell>
  );
}
