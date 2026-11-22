# DEPLOYMENT_GUIDE — RentProof (Render)

Production URL: https://rentproof2.onrender.com

## Build / start

```
npm install
npm run build
npm start
```

Render blueprint: `render.yaml`  
Disk: `/data` → SQLite `RENTPROOF_DB_PATH=/data/rentproof.sqlite`, uploads `/data/uploads`.

## Обязательные переменные

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_SITE_URL` | `https://rentproof2.onrender.com` |
| `RENTPROOF_DB_PATH` | `/data/rentproof.sqlite` |
| `RENTPROOF_UPLOAD_DIR` | `/data/uploads` |
| `RENTPROOF_COOKIE_SECURE` | `1` |
| `RENTPROOF_LISTING_AUTO_PUBLISH` | `1` (реальная публикация) |
| `RENTPROOF_PAYMENTS_ENABLED` | `0` (пока платежи не подключены) |

## Почта (подтверждение / reset)

Без SMTP коды создаются, письма пишутся в server log через console-адаптер.

```
MAIL_DRIVER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=RentProof <noreply@your-domain>
```

## ИИ (TokenLavka)

```
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://tokenlavka.com/v1
OPENAI_MODEL=gpt-6-luna
```

Ключи только на сервере — не в frontend / не в Git.

## Юридические placeholders

```
LEGAL_OPERATOR_NAME=
LEGAL_OPERATOR_ADDRESS=
LEGAL_OPERATOR_EMAIL=
LEGAL_OPERATOR_INN=
LEGAL_OPERATOR_OGRN=
```

Документы остаются **DRAFT**, пока владелец не заполнит реквизиты и не утвердит тексты. Не публикуйте вымышленные ИНН/ОГРН.

## Тарифы (опционально переопределить)

Defaults: FREE 0 / PLUS 299 / PRO 799. Лимиты: `RENTPROOF_PLAN_*_LISTINGS|AI|HISTORY|CUSTOMERS`.

## Платежи (позже, только с подтверждением)

Не включать без отдельного решения владельца.

```
RENTPROOF_PAYMENTS_ENABLED=1   # только после явного OK
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_MODE=test
YOOKASSA_RETURN_URL=https://rentproof2.onrender.com/payments/return
```

Live mode в коде заблокирован.

## Миграции / данные

Миграции применяются при старте (`getDb()` → `migrate` → `seed`).  
Демо-объявления удаляются автоматически. Пользовательские данные сохраняются.

## Health / smoke после деплоя

1. `/` — пустой каталог или реальные объявления, CTA «Разместить».
2. `/register` → `/verify-email` (при SMTP — письмо).
3. `/listings/create` → объявление в `/catalog`.
4. `/documents` — DRAFT-страницы.
5. `/pricing` — 0 / 299 / 799, кнопка оплаты не имитирует успех.
6. `npm test` локально перед merge.

## Не менять без подтверждения владельца

DNS, production secrets, live-эквайринг, необратимое удаление пользовательских данных.
