import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "О платформе — RentProof",
  description: "RentProof помогает сравнивать аренду имущества до сделки: цена, залог, фото и история заявок.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <article className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-navy">О RentProof</h1>
        <p className="mt-4 text-base leading-7 text-graphite">
          RentProof — платформа объявлений об аренде. В карточке видны цена, залог, город, характеристики и материалы о состоянии. Заявки, отзывы и модерация хранятся на сервере.
        </p>
        <p className="mt-4 text-base leading-7 text-graphite">
          Визуальная оценка по фотографии не заменяет осмотр и не подтверждает исправность. Демонстрационные объявления отмечены отдельно. Платежи в этой версии не проводятся.
        </p>
      </article>
    </PageShell>
  );
}
