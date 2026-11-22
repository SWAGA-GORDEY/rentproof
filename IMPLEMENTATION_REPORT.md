# IMPLEMENTATION_REPORT — RentProof global modernization

Дата: 2026-11-22 (UTC+5, Asia/Yekaterinburg)  
Ветка: `cursor/rentproof-global-modernize-f2a8`  
Base: `master`

## Что сделано

1. **Демо-каталог убран** — seed больше не создаёт demo-owner/объявления; существующие `is_demo` / `demo-*` удаляются при старте.
2. **Реальная публикация** — submit объявления сразу ставит `published` (`RENTPROOF_LISTING_AUTO_PUBLISH=1` по умолчанию).
3. **Тарифы** FREE / PLUS **299 ₽** / PRO **799 ₽** + лимиты в `src/lib/plan-config.ts` (env override).
4. **Платежи выключены** — `RENTPROOF_PAYMENTS_ENABLED=0`; нет фиктивной «оплачено»; архитектура PaymentProvider / ЮKassa сохранена для будущего.
5. **Email verification** — unverified → код → verified; mail adapter console/SMTP.
6. **Password reset** — `/forgot-password`, `/reset-password`, хеш токена, TTL, rate limit.
7. **Legal DRAFT** — `/documents/*`, consents versioning, отзыв в `/account/security`.
8. **CRM** — `/account/customers` с лимитами тарифа и изоляцией владельца.
9. **Кабинет** — история, аналитика, безопасность (сессии, смена email, удаление аккаунта), подписка с usage.
10. **Подписки** — expiry → FREE, история, отмена продления; без live charges.

## Ключевые файлы

- `src/lib/seed.ts`, `src/lib/listings.ts`, `src/lib/plan-config.ts`, `src/lib/plans.ts`
- `src/lib/mail/*`, `src/lib/email-verification.ts`, `src/lib/password-reset.ts`
- `src/lib/legal.ts`, `src/lib/customers.ts`, `src/lib/subscription-lifecycle.ts`, `src/lib/payment-provider.ts`
- `src/app/verify-email`, `forgot-password`, `reset-password`, `documents/*`
- `src/app/account/{customers,security,analytics,history,subscription}`
- `.env.example`, `render.yaml`, `PROJECT_AUDIT.md`, `DEPLOYMENT_GUIDE.md`

## Что работает

- Регистрация + согласия + verify email flow  
- Вход / выход / reset password  
- Создание объявлений → сразу в каталог  
- CRM, лимиты backend  
- ИИ (при ключе), кабинет разделы  
- Документы DRAFT без выдуманных реквизитов  

## Тесты

```
npm test  → 35 passed (auth, marketplace, payments fake, modernize)
npm run build → OK
```

Modernize покрывает: auto-publish, цены 299/799, purge demo, verification, reset, CRM limits, consent revoke, subscription expiry.

## Осталось / нужно от владельца

1. Заполнить SMTP на Render (`MAIL_DRIVER=smtp`, `SMTP_*`).
2. Заполнить `LEGAL_OPERATOR_*` реальными данными и утвердить тексты (сейчас DRAFT).
3. Юридически: 152-ФЗ / хостинг РФ, модель НПД для платного SaaS.
4. Платежи **не включать**, пока не будет отдельного подтверждения.
5. Verification tokens для Google/Yandex Search Console при необходимости.

## Env для production (добавить, если нет)

См. `.env.example`. Критичные: `RENTPROOF_DB_PATH`, `RENTPROOF_UPLOAD_DIR`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_*`, `MAIL_*` / `SMTP_*`, `LEGAL_OPERATOR_*`, `RENTPROOF_PAYMENTS_ENABLED=0`, `RENTPROOF_LISTING_AUTO_PUBLISH=1`.
