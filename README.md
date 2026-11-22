# RentProof

Серверная платформа аренды: регистрация, каталог, объявления, бронирование, фиксация состояния и визуальная оценка фотографий. Платежи не списываются. Без ключа модели AI-отчёт не подменяется готовым текстом.

## Запуск

Нужен Node.js 22 или новее.

```bash
npm install
copy .env.example .env
npm run dev
```

Приложение открывается на http://localhost:3000. База SQLite создаётся в `data/rentproof.sqlite`, фотографии — в `data/uploads`. Эти файлы не коммитятся.

```bash
npm test
npm run lint
npm run build
npm start
```

## Администратор (Developer Control Center)

Публичной регистрации OWNER/ADMIN нет. Зарегистрируйте обычный аккаунт, затем задайте `OWNER_EMAIL` (email существующего аккаунта, без пароля в env) и перезапустите сервис. Подробности: `OWNER_SETUP.md`.

`RENTPROOF_ADMIN_EMAIL` / `RENTPROOF_ADMIN_PASSWORD` устарели и игнорируются.

## AI (TokenLavka)

Ключ хранится только на сервере (`process.env`): `OPENAI_API_KEY` (или `TOKENLAVKA_KEY`), `OPENAI_BASE_URL=https://tokenlavka.com/v1`, `OPENAI_MODEL` (алиас `OPENAI_VISION_MODEL`). Браузер и localStorage ключ не читают. Если ключ пуст, отчёт сохраняется со статусом «нужна настройка».

```bash
npm run test:ai
```

## Данные

Схема применяется при открытии базы и не удаляет существующие учётные записи. Демонстрационные объявления помечены и добавляются только если их ещё нет.
