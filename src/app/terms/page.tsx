import { PageShell } from "@/components/page-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Пользовательское соглашение",
  description: "Условия использования каталога аренды RentProof, объявлений, заявок и визуальной оценки.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-navy">Пользовательское соглашение</h1>
        <p className="mt-3 text-sm text-muted">Демонстрационная редакция. Перед коммерческим запуском согласуйте юридический текст.</p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Предмет сервиса</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          RentProof предоставляет площадку объявлений об аренде оборудования, техники и иного имущества. Сделка заключается
          между пользователями. Платформа не является стороной договора аренды и не гарантирует исправность предмета.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Объявления и модерация</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          Автор отвечает за достоверность описания и фотографий. Публикация в каталоге возможна после модерации. Демонстрационные
          карточки помечаются отдельно.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Бронирование и оплата</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          Расчёт стоимости на экране носит демонстрационный характер. В текущей версии платёжный провайдер не подключён, списания
          не выполняются.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Визуальная оценка</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          AI-отчёт описывает только видимые на загруженных снимках признаки и не является технической экспертизой, страховкой
          или подтверждением безопасности предмета.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Ограничение ответственности</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          Сервис предоставляется «как есть». Операторы не отвечают за убытки от сделок между пользователями, простоев хостинга
          или ответов внешней модели. Споры по аренде стороны решают самостоятельно.
        </p>
      </article>
    </PageShell>
  );
}
