# PROJECT_AUDIT — RentProof

Дата: 2026-11-22 (UTC) / Asia/Yekaterinburg  
Репозиторий: SWAGA-GORDEY/rentproof  
Production: https://rentproof2.onrender.com  
Ветка работ: `cursor/rentproof-global-modernize-f2a8`

## Стек

| Слой | Факт |
|------|------|
| Frontend / Backend | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 |
| Данные | SQLite (`node:sqlite`), миграции в `src/lib/schema.ts`, диск Render `/data` |
| Auth | Регистрация/сессии cookie, scrypt, email verification, password reset |
| AI | TokenLavka OpenAI-compatible, только server `process.env` |
| Платежи | ЮKassa в коде; по умолчанию **выключены** (`RENTPROOF_PAYMENTS_ENABLED=0`) |
| Почта | MailAdapter: `console` / `smtp` (nodemailer), конфиг через env |

## Что уже работает

- Регистрация с отдельными согласиями, вход, выход, смена пароля.
- Подтверждение email (одноразовый код, TTL, rate limit, хеш в БД).
- Восстановление пароля по email-ссылке.
- Каталог: поиск, фильтры, категории; **демо-объявления удалены**.
- Объявления: создание → **auto-publish** в каталог (можно вернуть модерацию env-флагом).
- CRM клиентов с изоляцией по владельцу и лимитами тарифа.
- Тарифы FREE / PLUS **299 ₽** / PRO **799 ₽**, лимиты из `plan-config` + env.
- Подписки: статусы, история, expiry → FREE, PaymentProvider abstraction; живые платежи не активируются.
- Юридические документы DRAFT + версионирование согласий / отзыв.
- Кабинет: объявления, аренды, клиенты, история, аналитика, подписка, безопасность, настройки, ИИ, документы.
- AI assessment (серверные ключи), лимиты по тарифу.
- Автотесты: auth, marketplace, payments (fake), modernize (35 passed).

## Что ещё требует владельца / не в коде

| Область | Статус |
|---------|--------|
| SMTP на Render | Без `SMTP_*` письма идут в console-адаптер (коды создаются, но email не доставляется) |
| Юр. реквизиты | Placeholders DRAFT; нужны реальные `LEGAL_OPERATOR_*` и утверждение текстов |
| Платежи | Не подключать, пока владелец не включит явно |
| 152-ФЗ / хостинг РФ | SQLite на Render — юридическая оценка на владельце |
| НПД + платный SaaS | Юридическая проверка на владельце |
| GSC / Yandex verification | Owner tokens |

## Технические риски

- Один SQLite-файл на Render — нет HA; бэкапы на владельце.
- Без SMTP регистрация работает, но подтверждение email не уходит наружу.
- ЮKassa live запрещён в клиенте; не включать без подтверждения.
- Не публиковать DRAFT-документы как утверждённые без реквизитов.

## Ограничения этой итерации

Не выполняем: реальные платежи, DNS, смену секретов Render, выдуманные ИНН/ОГРН, необратимое удаление не-демо пользовательских данных.
