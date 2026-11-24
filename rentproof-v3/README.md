# RentProof v3

Новая независимая версия RentProof. Её можно запускать отдельно от старого приложения; каталог, учётные записи, заявки и административная панель используют собственную схему базы данных.

## Локальный запуск

Требуются Node.js 22.13+ и npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Локально приложение создаёт SQLite-базу `data/rentproof-v3.sqlite`. Для писем, отправки AI-запросов и первичной настройки администратора заполните соответствующие переменные в `.env.local`. Не публикуйте файл с секретами.

## Production

Разверните именно эту папку приложения: для Render задайте **Root Directory** `rentproof-v3`, **Build Command** `npm ci && npm run build`, **Start Command** `npm run start`. Для production требуется PostgreSQL через `DATABASE_URL`; SQLite намеренно запрещён без постоянного диска.

Обязательные переменные:

- `DATABASE_URL` — PostgreSQL.
- `RESEND_API_KEY` и `MAIL_FROM` — подтверждение email; используйте проверенный домен отправителя.
- `OWNER_EMAIL` и `OWNER_BOOTSTRAP_TOKEN` — однократное создание первого администратора через `/setup`. Токен должен быть случайным и не короче 24 символов.
- `TOKENLAVKA_API_KEY`, `TOKENLAVKA_BASE_URL`, `TOKENLAVKA_MODEL` — серверный AI-провайдер. Ключ нельзя задавать с префиксом `NEXT_PUBLIC_`.

После создания администратора `/setup` закрывается на уровне приложения. Админка доступна по `/admin` и совместимому адресу `/owner`.

Перед публичным запуском заполните юридические сведения оператора в `/terms` и `/privacy`, подключите домен отправителя Resend и настройте резервное копирование PostgreSQL.

## Команды

```powershell
npm run lint
npm run build
npm run start
```
