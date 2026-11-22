# Payment Implementation Plan — RentProof × ЮKassa (TEST)

Date: 2026-11-22 (UTC) / Asia/Yekaterinburg  
Production: https://rentproof2.onrender.com  
Branch: `cursor/yookassa-payments-f2a8`

## 1. Audit summary

| Area | Current state |
|------|----------------|
| Stack | Next.js 16 App Router, server actions, Node `node:sqlite` |
| DB | **SQLite** (`RENTPROOF_DB_PATH`), not PostgreSQL. Persist on Render disk `/data`. |
| ORM | None — raw SQL + `schema.ts` migrate |
| Auth | Cookie sessions, Argon-style hashing via existing `users`/`sessions` |
| Plans | `plans.ts` Free / Plus (1490 ₽) / Pro (3990 ₽); demo assign via `assignDemoPlan` |
| Bookings | `bookings` with server-side quote (`rent_amount`, `deposit_amount` in **rubles integers**) |
| Payments | **None**. `billingStatus().chargesEnabled === false`, provider `none` |
| Render | Docker + env; no YooKassa vars yet |

**Decision:** Integrate on the existing SQLite + session stack. Do **not** introduce a parallel Postgres billing DB. Do **not** enable live charges (`YOOKASSA_MODE=test` only).

## 2. Goals (this PR)

1. Server YooKassa client (HTTP v3) with idempotency keys.
2. Tables: payments, payment_events, billing subscriptions fields, rental_orders, refunds, payouts, idempotency log.
3. Subscription checkout for Plus/Pro; Free remains free.
4. Rental order payment linked to booking; amounts in **kopecks** in payment tables.
5. Webhook + return-page sync; activate only after provider-confirmed `succeeded`.
6. UI: pricing pay CTAs, return success/fail, «Мои платежи», order status.
7. Safe Deal: **adapter + docs only** — no fake payouts.
8. Fake provider for automated tests when keys are absent.
9. Docs: `YOOKASSA_SETUP.md`, `PAYMENT_SYSTEM_REPORT.md`, `PAYMENT_TEST_REPORT.md`.

## 3. Money model

- Existing `bookings.rent_amount` / `deposit_amount` stay in **whole rubles** (compat).
- New payment/`rental_orders` amounts stored as **integer kopecks**.
- Conversion: `rubles * 100`.
- Platform fee: configurable `RENTPROOF_PLATFORM_FEE_BPS` (default **500** = 5% of rent).
- Deposit is **not** charged in the simple test payment (held for future Safe Deal); shown in UI as pending escrow capability.

## 4. YooKassa flows

### Subscription

1. Authenticated user selects Plus/Pro.
2. Server creates `payments` row (purpose=`subscription`) + idempotency key.
3. `POST /v3/payments` with `capture: true`, RUB, metadata `{ paymentId, userId, plan }`.
4. Redirect to `confirmation.confirmation_url`.
5. Webhook / return page: `GET /v3/payments/{id}`, verify amount/currency/shop, mark succeeded, write subscription with `expires_at` (+30 days), set `users.plan`.
6. Autorenewal: `renewal_status=off` always in this phase.

### Rental

1. Existing booking create stays; renter can «Оплатить аренду» on booking detail when pending/confirmed unpaid.
2. Server builds `rental_orders` from **server quote** (ignores client totals).
3. Creates payment; on success sets order `payment_status=paid`, booking may stay pending until owner confirms (payment ≠ auto-confirm).
4. Double-pay blocked by unique open payment per order + status checks.
5. Overlap rules unchanged.

### Safe Deal / Payout

- `payouts` table + status UI: `awaiting_deal`, `refund_pending`, `payout_pending`, `paid_out`.
- Without merchant Safe Deal entitlement: operations return explicit `safe_deal_unavailable`; admin cannot mark paid_out without provider confirmation.

## 5. Security

- Secrets only in server env (`YOOKASSA_SECRET_KEY` never `NEXT_PUBLIC_*`).
- Authz on every payment/order read/write.
- Webhook: accept event → re-fetch payment from API → validate → idempotent apply.
- Rate-limit payment creation.
- Audit log for admin refund attempts.

## 6. Env (Render)

```
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_API_URL=https://api.yookassa.ru/v3
YOOKASSA_MODE=test
YOOKASSA_RETURN_URL=https://rentproof2.onrender.com/payments/return
RENTPROOF_PLATFORM_FEE_BPS=500
RENTPROOF_BILLING_PROVIDER=yookassa
```

Owner must paste **test** shop credentials. Agent will not invent keys or switch to live.

## 7. Out of scope

- Live/production charges
- Real payouts / Safe Deal money movement
- Autorenewal / saved cards
- Migrating marketplace data to PostgreSQL
- Destroying demo `subscriptions` history (keep; new rows use `mode=yookassa_test`)
