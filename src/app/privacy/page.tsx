import { PageShell } from "@/components/page-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Политика конфиденциальности",
  description: "Как RentProof обрабатывает учётные данные, объявления, фотографии и журналы на сервере.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-semibold text-navy">Политика конфиденциальности</h1>
        <p className="mt-3 text-sm text-muted">Редакция для демонстрационной версии RentProof. Обновите текст перед коммерческим запуском.</p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Какие данные обрабатываются</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          На сервере сохраняются адрес электронной почты, имя, роль (арендатор или арендодатель), содержимое объявлений,
          заявки на аренду, отзывы, загруженные изображения и служебные журналы действий. Пароли хранятся только как scrypt-хеш.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Для чего используются данные</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          Данные нужны, чтобы показывать каталог, принимать заявки, вести кабинет пользователя и запускать визуальную оценку
          загруженных фотографий через серверный API. Ключ модели не передаётся в браузер.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Передача третьим лицам</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          При включённой AI-оценке изображения и текстовое описание отправляются в настроенный OpenAI-совместимый шлюз
          (TokenLavka) только с сервера. Платёжный провайдер в этой версии не подключён, деньги не списываются.
        </p>

        <h2 className="mt-8 font-display text-2xl font-semibold text-navy">Хранение и доступ</h2>
        <p className="mt-3 text-sm leading-7 text-graphite">
          База и файлы размещаются на хостинге оператора сервиса. Доступ администратора выдаётся отдельно и не доступен через
          публичную регистрацию. Запросы на уточнение обработки данных направляйте через страницу контактов.
        </p>
      </article>
    </PageShell>
  );
}
