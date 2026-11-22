# Payment System Report — RentProof × ЮKassa

Date: 2026-11-22 (UTC) / Asia/Yekaterinburg  
Branch: `cursor/yookassa-payments-f2a8`  
DB: existing **SQLite** (not PostgreSQL)

## Implemented

| Area | Detail |
|------|--------|
| Provider client | HTTP ЮKassa API v3 + Fake client for tests/`RENTPROOF_YOOKASSA_FAKE=1` |
| Payments table | purpose, status, amount **kopecks**, idempotency key, provider id |
| Events | `payment_events` + idempotent webhook handling |
| Subscriptions | Free free; Plus/Pro paid; activate only after `succeeded`; `renewal_status=off` |
| Rental orders | Server quote → kopecks + platform fee; link to booking; anti double-pay |
| Webhook | `POST /api/payments/yookassa/webhook` — re-fetch + amount/currency checks |
| UI | `/pricing`, `/payments/return|success|fail`, `/account/payments`, `/account/subscription`, booking pay CTA, `/admin/payments` |
| Security | Authz, rate limit, no secrets in frontend, live mode blocked |
| Docs | `PAYMENT_IMPLEMENTATION_PLAN.md`, `YOOKASSA_SETUP.md`, this file, `PAYMENT_TEST_REPORT.md` |

## Not completed / blocked

| Item | Reason |
|------|--------|
| Real test shop end-to-end on Render | Needs Michael’s `YOOKASSA_SHOP_ID` + `YOOKASSA_SECRET_KEY` |
| Безопасная сделка / payouts | Requires separate ЮKassa entitlement; UI + `payouts` row with `unavailable` only — **not simulated as paid** |
| Autorenewal / saved cards | Explicitly off |
| Live charges | Forbidden |
| PostgreSQL billing | Project remains on SQLite + Render disk |

## Prices (config in `src/lib/plans.ts`)

- Free: 0
- Plus: 1490 ₽ / month (149_000 kopecks)
- Pro: 3990 ₽ / month (399_000 kopecks)
- Platform fee: `RENTPROOF_PLATFORM_FEE_BPS` (default 500 = 5% of rent). Deposit not charged until Safe Deal.

## Render variables required from owner

See `YOOKASSA_SETUP.md`. Minimum to enable test checkout on production:

- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- keep `YOOKASSA_MODE=test`

## Architecture notes

- Existing `bookings.rent_amount` stays in whole rubles; payment/`rental_orders` use kopecks.
- Demo plan buttons removed from settings; checkout goes through ЮKassa (or Free).
- Admin cannot mark payment succeeded without provider confirmation.
