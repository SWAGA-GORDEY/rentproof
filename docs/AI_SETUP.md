# Подключение визуальной оценки (TokenLavka)

Модуль читает загруженные изображения **только на сервере** и вызывает OpenAI-совместимый Chat Completions API через TokenLavka. Ключ не попадает в браузер, не пишется в localStorage и не хранится в Git.

## Переменные окружения

Задайте их в `.env` локально или в секретах Render / хостинга (Environment → Secret):

```
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://tokenlavka.com/v1
OPENAI_MODEL=gpt-6-luna
```

Допустимые алиасы:

- `TOKENLAVKA_KEY` — если `OPENAI_API_KEY` пуст;
- `OPENAI_VISION_MODEL` — если `OPENAI_MODEL` пуст.

### Auth и URL (по документации TokenLavka)

| Параметр | Значение |
| --- | --- |
| Base URL | `https://tokenlavka.com/v1` (без `/chat/completions`) |
| Auth | `Authorization: Bearer sk-…` |
| Endpoint | `POST {OPENAI_BASE_URL}/chat/completions` |
| Модель | ID из таблицы TokenLavka, например `gpt-6-luna`, `economy` |

Не указывайте `https://api.openai.com/v1` для ключа TokenLavka: шлюз вернёт 401 с адресом OpenAI.

После изменения переменных **перезапустите** сервис.

## Бюджет (~500 ₽/месяц)

Мягкие ограничители (подстройте по факту расхода в кабинете TokenLavka):

```
RENTPROOF_AI_HOURLY_LIMIT=4
RENTPROOF_AI_MONTHLY_CAP=40
RENTPROOF_AI_MAX_TOKENS=1200
```

Повторные автоматические ретраи к провайдеру не выполняются. Admin probe (`POST /api/ai/connection`) тоже расходует месячный soft-cap.

## Как вызывается API из приложения

1. Браузер отправляет форму на server action `analyzeAction` (`src/app/actions/ai.ts`) — same-origin, без CORS к TokenLavka.
2. Сервер сохраняет фото и вызывает `createAiReport` → `callVision` (`src/lib/ai.ts`).
3. `callVision` читает ключ через `process.env` (`src/lib/ai-provider.ts`) и делает `fetch` на TokenLavka.
4. Ответ модели парсится в JSON-отчёт. Ключ никогда не возвращается клиенту.

Проверка статуса без ключа в ответе:

```bash
npm run test:ai
curl -s http://localhost:3000/api/ai/connection
# живой probe (только администратор):
curl -s -X POST http://localhost:3000/api/ai/connection
```

## Если ключа нет

Запрос всё равно сохраняется в `ai_reports`:

- статус `unavailable`;
- `report_json` пустой;
- код ошибки `missing_api_key`.

Страница честно пишет, что интеграция требует настройки на сервере. Подставной текст анализа не создаётся.

## Коды ошибок провайдера

Сохраняются в `error_code` без тела ключа: `provider_401`, `provider_402`, `provider_404`, `provider_429`, `provider_timeout`, `provider_network`, `provider_parse`, `provider_empty`, либо `provider_http_<status>`.

## Что отчёт может и чего не может

Отчёт описывает видимые признаки: повреждения, износ, царапины, трещины, качество снимка и области неопределённости. Балл 0–100 — визуальная оценка по методике в `src/lib/ai.ts`, а не техническая экспертиза. Модель не должна утверждать, что предмет исправен только по фотографии.
