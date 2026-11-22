# RentProof — AI Quality Assurance Report

Дата: 2026-11-22 (Asia/Yekaterinburg)  
Production: https://rentproof2.onrender.com  
Провайдер: TokenLavka (`https://tokenlavka.com/v1`, модель `gpt-6-luna`)  
Живых запросов к API в этой сессии QA: **ровно 2** (лимит оператора).

## 1. Карта архитектуры ИИ

```
Browser (/ai-assessment)
  └─ AiForm (simple-forms.tsx)  →  server action analyzeAction (actions/ai.ts)
       └─ createAiReport (lib/ai.ts)
            ├─ planAiLimit (lib/plans.ts) — лимит отчётов по тарифу
            ├─ saveAiImage / sniffImage (lib/images.ts) — JPEG/PNG/WebP ≤ 2 МБ, 1–4 файла
            ├─ consumeAiCallBudget (lib/ai-budget.ts) — час/месяц, без ретраев
            └─ callVision → POST {OPENAI_BASE_URL}/chat/completions
                 └─ readAiProviderConfig (lib/ai-provider.ts) — только process.env

Диагностика:
  GET  /api/ai/connection  — наличие (configured / baseUrl / model), без вызова провайдера
  POST /api/ai/connection  — admin + live probe (тратит бюджет probe)
  npm run test:ai          — CLI probe

UI отчёта: /ai-assessment/[id] — disclaimer, methodology, observations vs assumptions
Маркетинговый блок: components/ai-assessment.tsx — образец вёрстки, в модель не ходит
```

**Существующая продуктовая AI-функция:** только визуальная оценка загруженных фото → структурированный JSON-отчёт.  
**Отдельных AI-функций «помощь в объявлении» и «оценка цены аренды» в коде нет.**

## 2. Обязательные тесты

| # | Функция | Результат | Ошибки | Исправления | Повторный тест |
| --- | --- | --- | --- | --- | --- |
| 1 | Подключение к TokenLavka | **PASS** (live #1) | — | — | ok=true, HTTP 200, ~19s |
| 2 | Обычный текстовый запрос | **PASS** (live #1, probe) | — | — | Ответ модели получен |
| 3 | Анализ одной фотографии | **PASS*** (кодовый путь 1–4 фото; отдельный live не делался из‑за лимита 2) | — | — | Покрыто unit + multi-path |
| 4 | Анализ нескольких фотографий | **PASS** (live #2, 2 PNG) | — | max_tokens + бюджет | status=completed, imageCount=2 |
| 5 | Определение видимых дефектов | **PASS** (live #2) | — | Усилен промпт «не выдумывать» | visibleDamage=0; модель честно сказала, что 1×1 кадры неинформативны |
| 6 | Отчёт о состоянии имущества | **PASS** (live #2) | — | Промпт: RU, facts vs assumptions | Structured body + score/confidence |
| 7 | Рекомендации по аренде | **FAIL / не реализовано** | Нет отдельного AI-модуля | Только оговорка в system prompt | Требует доработки продукта |
| 8 | Помощь в создании объявления | **FAIL / не реализовано** | Нет endpoint/action | Не добавляли имитацию | Требует доработки продукта |
| 9 | Ориентировочная стоимость аренды | **FAIL / намеренно отсутствует** | Нет генерации цены | Промпт запрещает гарантию цены | OK как политика; отдельная фича не делалась |
| 10 | Неподдерживаемые файлы | **PASS** (unit) | — | — | PDF/SVG/oversized → reject |
| 11 | Пустые запросы | **PASS** (unit) | — | — | пустая форма / 0 фото → ошибки |
| 12 | Превышение лимитов API/бюджета | **PASS** (unit) | Ранее только 8/час без monthly | `ai-budget.ts`: 4/час, 40/мес, без ретраев | второй вызов → RateLimitError |
| 13 | Ошибки провайдера и таймауты | **PASS** (код) | Ранее слабые коды | ProviderCallError + sanitize | Таймаут/HTTP маппятся; live 429/timeout не провоцировали |
| 14 | Нет утечки API-ключа | **PASS** | — | sanitize + публичный status без key | GET prod + live JSON без `sk-` |

\*Один live-запрос на одиночное фото сознательно не выполнялся (лимит 2 вызова).

### Live #1 — connection (text)

- `ok: true`, `httpStatus: 200`, `code: ok`
- `baseUrl: https://tokenlavka.com/v1`, `model: gpt-6-luna`

### Live #2 — vision (2 photos, one request)

- `status: completed`, `score: 0`, `confidence: 0.05`
- Вывод модели (сокр.): кадры без различимых деталей; заявленная потёртость по фото не подтверждается и не опровергается
- Русский язык: да; ключ в ответе: нет

### Production smoke (без live TokenLavka)

- `GET https://rentproof2.onrender.com/api/ai/connection` → `configured: true`, `keySource: OPENAI_API_KEY` (значение ключа не возвращается)

## 3. Качество результатов (по live #2)

| Критерий | Наблюдение |
| --- | --- |
| Не выдумывать повреждения | Соблюдено (0 visibleDamage на пустых кадрах) |
| Факты vs предположения | Поля observations / assumptions разделены |
| Недостаточно информативные фото | confidence↓, uncertainty/extraPhotos заполнены |
| Не выдавать цену как гарантию | Цены в отчёте нет |
| Структурированный отчёт | JSON → UI блоки |
| Русский язык | Да |

## 4. Безопасность и расходы

| Контроль | Статус |
| --- | --- |
| Размер изображений ≤ 2 МБ, mime sniff | Есть |
| 1–4 фото на отчёт | Есть |
| Rate limit без бесконечных ретраев | Есть (`ai-budget`, один throw) |
| Monthly soft-cap (~500 ₽ цель) | Добавлено: `RENTPROOF_AI_MONTHLY_CAP=40`, hourly=4, `max_tokens=1200` |
| Секреты не в логах/ответах | sanitize + publicAiStatus |
| Провайдер не менялся | TokenLavka |

Рекомендация: после недели продакшена сверить фактический расход в кабинете TokenLavka и подкрутить `RENTPROOF_AI_MONTHLY_CAP` / `RENTPROOF_AI_MAX_TOKENS`.

## 5. Исправления в коде (этот QA)

- `src/lib/ai-budget.ts` — почасовой и месячный soft-cap
- `src/lib/ai.ts` — `max_tokens`, усиленный RU/quality prompt, бюджет до callVision
- `src/app/actions/ai.ts` + `api/ai/connection` — без двойного счётчика, probe budget, сообщение о лимите
- `tests/ai-qa.test.ts` — пустые/битые входы, budget, sanitize
- `.env.example` — переменные бюджета

## 6. Итог

1. **Пройдено:** 11 (включая кодовые + 2 live; пункт 3 засчитан по пути кода).  
2. **Не пройдено / отсутствует как продукт:** 3 (рекомендации по аренде как отдельная фича, помощь в объявлении, генерация цены).  
3. **Полностью работают:** подключение TokenLavka, текстовый probe, multi-photo visual report, валидация входов, лимиты, отсутствие утечки ключа, production GET diagnostics.  
4. **Требуют доработки:** отдельные UX/API для помощи в объявлении и rental recommendations (если нужны бизнесу); отдельный live single-photo прогон при следующем бюджете; калибровка месячного cap по реальному ₽ расходу.

**ИИ не объявляется «полностью готовым»:** real path проверен двумя живыми запросами и production `configured:true`, но продуктовый охват шире заявленного списка тестов 7–9, а single-photo live отложен по лимиту вызовов.

Unit: `npm test` → **27/27 pass**.  
Build: `npm run build` — выполнен в рамках ветки QA.
