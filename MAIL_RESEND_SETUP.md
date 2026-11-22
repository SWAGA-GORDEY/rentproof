# RentProof — настройка почты через Resend (Render)

Интеграция: `MAIL_DRIVER=resend`, официальный SDK `resend`, ключ только в env `RESEND_API_KEY`. SMTP сохранён (`MAIL_DRIVER=smtp`).

## 1. Resend Dashboard

1. Создайте API key в Resend (Permissions: Sending access).
2. Пока домен `rentproof.ru` не верифицирован, From: **`onboarding@resend.dev`** (тестовый адрес Resend).
3. Позже: верифицируйте домен → From: **`support@rentproof.ru`**.

## 2. Render → Environment

Добавьте / обновите:

| Key | Value |
|-----|--------|
| `MAIL_DRIVER` | `resend` |
| `RESEND_API_KEY` | `re_…` (секрет, Sync: false) |
| `MAIL_FROM` | `RentProof <onboarding@resend.dev>` |
| `NEXT_PUBLIC_SITE_URL` | `https://rentproof2.onrender.com` |

Не кладите ключ в Git, чат-логи или скриншоты. Если ключ засветился — **сразу revoke + новый**.

Опционально оставьте SMTP-переменные пустыми; они нужны только при `MAIL_DRIVER=smtp`.

## 3. Redeploy / Restart

После сохранения env — **Manual Deploy** или Restart сервиса, чтобы процесс подхватил переменные.

## 4. Проверка на сайте

1. Зарегистрируйте тестовый аккаунт (или запросите код на `/verify-email`).
2. Письмо: приветствие + крупный 6-значный код, TTL 10 минут.
3. Повторная отправка: кнопка на `/verify-email` (лимит ~3 / 15 мин).
4. `/forgot-password` → письмо с кодом (1 час) → `/reset-password` (email + код + новый пароль).
5. Для несуществующего email ответ тот же (без enumeration).

## 5. Локальная проверка (dev)

```bash
export MAIL_DRIVER=resend
export RESEND_API_KEY=re_…          # только в shell, не в файл репозитория
export MAIL_FROM='RentProof <onboarding@resend.dev>'
export NEXT_PUBLIC_SITE_URL=http://localhost:3000
npm run dev
```

На тестовом From Resend обычно доставляет только на email владельца аккаунта Resend — это ограничение песочницы, не баг приложения.

## 6. Что не логируется

Адаптер и `sendMail` не пишут API key, тело письма и коды. В audit — только факт issue/verify без кода.
