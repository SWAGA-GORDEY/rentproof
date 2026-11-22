# RentProof — SEO Audit (Google + Yandex)

Дата: 2026-11-22 (Asia/Yekaterinburg)  
Production: https://rentproof2.onrender.com  

**Индексация в Google/Яндексе не подтверждена.** Ниже — техническая готовность сайта, не факт попадания в выдачу.

## Что реализовано

| Область | Статус |
| --- | --- |
| `sitemap.xml` (App Router) | Да — статика + категории + опубликованные объявления |
| `robots.txt` | Да — allow публичное, disallow кабинет/админ/auth/API/AI/listings/media |
| Canonical URLs | Да — через `pageMetadata` / listing metadata + `metadataBase` |
| Уникальные title/description | Да — публичные страницы и объявления |
| Open Graph / Twitter | Да |
| H1–H3 | Да — публичные лендинги и категории |
| Favicon | Да — `src/app/icon.svg` |
| 404 / error UI | Да — `not-found.tsx`, `error.tsx` |
| Schema.org | Organization + WebSite на всём сайте; Product/Offer на `/catalog/[id]` |
| Verification meta | Через `GOOGLE_SITE_VERIFICATION` и `YANDEX_VERIFICATION` |
| HTTPS | Обеспечивается Render (проверить в панели) |
| Мобильная вёрстка | Существующие responsive классы сохранены |
| Политика / соглашение / поддержка | `/privacy`, `/terms`, `/support` |
| Категории | `/categories/[id]` с уникальным SEO-текстом |

### Критичный фикс окружения

На production до деплоя этой ветки `robots.txt` и `sitemap.xml` отдавали **`http://localhost:3000`** — значит `NEXT_PUBLIC_SITE_URL` на Render не был задан (или был неверным).

В `render.yaml` и `Dockerfile` (build-arg) задано значение `https://rentproof2.onrender.com`.  
Если сервис создан вручную — **обязательно** выставить ту же переменную в Environment **и** на этапе Docker build, затем сделать redeploy.

`robots.txt` и `sitemap.xml` теперь dynamic (`ƒ`), читают origin в runtime; клиентские/OG metadata всё ещё зависят от `NEXT_PUBLIC_SITE_URL` на build.

## Страницы для индексации (публичные)

- `/`
- `/catalog`
- `/catalog/[id]` — только опубликованные объявления
- `/categories/[id]`
- `/about`
- `/how-it-works`
- `/contacts`
- `/support`
- `/faq`
- `/pricing`
- `/privacy`
- `/terms`

## Страницы / зоны закрыты от индексации

| Зона | Как закрыто |
| --- | --- |
| `/account/*` | robots disallow + `robots: noindex` в layout |
| `/admin/*` | robots disallow + noindex |
| `/login`, `/register` | robots disallow + noindex |
| `/api/*` | robots disallow |
| `/listings/*` (создание/редактирование) | robots disallow |
| `/ai-assessment*` | robots disallow + noindex на списке |
| `/media/*` | robots disallow (медиа по прямой ссылке) |

Фиктивные объявления ради SEO **не создавались**.

## Sitemap / robots — проверка после деплоя

Ожидаемо после выкладки этой ветки:

```bash
curl -sS https://rentproof2.onrender.com/robots.txt
curl -sS https://rentproof2.onrender.com/sitemap.xml | head
```

Должны быть:

- `Sitemap: https://rentproof2.onrender.com/sitemap.xml`
- `<loc>https://rentproof2.onrender.com/...</loc>` (не localhost)
- без `/login`, `/register`, `/ai-assessment` в sitemap

До деплоя текущего PR production всё ещё может показывать localhost в sitemap/robots.

## Производительность (кратко)

| Проверка | Результат |
| --- | --- |
| SSR/PPR публичных страниц | Next App Router + `connection()` где нужна БД |
| Блокировка роботов | Не обнаружена на публичных путях (allow `/`) |
| Изображения | Отдача через `/media/[id]`; OG использует первое фото объявления |
| Core Web Vitals | Числовые CWV из Search Console **не снимались** в этой сессии — замер вручную после деплоя |

## Обнаруженные ошибки / риски

1. **Production SITE_URL** был localhost → битые canonical/sitemap (исправление в коде + env).
2. Старый sitemap включал login/register/ai-assessment — **исправлено**.
3. Не хватало legal/support/category лендингов — **добавлено**.
4. Listing OG/JSON-LD были неполными — **усилено**.
5. Verification meta отсутствовали — **добавлен env-хук**.

## Что сделать вручную в Google и Яндексе

1. Выставить на Render: `NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com`.
2. (Опционально) задать `GOOGLE_SITE_VERIFICATION` и `YANDEX_VERIFICATION`, redeploy.
3. [Google Search Console](https://search.google.com/search-console): добавить ресурс URL-prefix `https://rentproof2.onrender.com`, подтвердить, отправить sitemap `https://rentproof2.onrender.com/sitemap.xml`.
4. [Яндекс Вебмастер](https://webmaster.yandex.ru/): добавить сайт, подтвердить, добавить тот же sitemap.
5. Проверить «Просмотр как Googlebot/робот» и покрытие после обхода.
6. Не считать сайт проиндексированным, пока в кабинетах не появятся проиндексированные URL.

## Сохранение функций

Каталог, кабинет, AI-оценка, бронирования и дизайн-система не удалялись; SEO-слой добавлен поверх существующих маршрутов.
