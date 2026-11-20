# RentProof

Площадка аренды имущества: объявления, каталог, заявки на даты и визуальная оценка снимков. Платежи не списываются. Суммы на экране — демонстрационный расчёт.

## Запуск

Нужен Node.js 22.13 или новее.

```
npm install
copy .env.example .env
npm run dev
```

Откройте http://localhost:3000.

```
npm test
npm run build
npm start
```

Production-сборка включает `output: "standalone"`. Долгоживущий процесс: `node .next/standalone/server.js` после копирования `public` и `.next/static` в каталог standalone. Образ для этого уже описан в `Dockerfile`.

## Данные

SQLite: `data/rentproof.sqlite`. Фотографии: `data/uploads`. Оба пути в `.gitignore`. Подробности и путь к PostgreSQL — в [docs/DATABASE.md](docs/DATABASE.md).

Администратор не регистрируется с сайта. Повышение:

```
RENTPROOF_ADMIN_EMAIL=you@example.com RENTPROOF_ADMIN_PASSWORD=long-secret npm run admin:bootstrap
```

Пароль не короче 10 символов. Команда создаёт или повышает существующего пользователя и ставит `is_admin`.

## Внешние сервисы

Визуальная модель подключается через `OPENAI_API_KEY`. Без ключа отчёт сохраняется как «нужна настройка», без выдуманного анализа. Инструкция: [docs/AI_SETUP.md](docs/AI_SETUP.md).

Почта не отправляется. Поля `SMTP_HOST` и `SMTP_FROM` только отмечают, что канал ещё не подключён. Тарифы Free, Plus и Pro переключаются в демонстрационном режиме и ничего не списывают.
