# ЮKassa setup — RentProof (TEST)

## 1. Create a test shop

1. Sign in to the ЮKassa merchant cabinet.
2. Create / open a **test** shop (not live).
3. Copy **shopId** and **secret key** for the test shop.
4. Do not enable live mode in RentProof until Michael explicitly approves.

## 2. Render environment (service `rentproof2`)

Set (Dashboard → Environment):

| Variable | Value |
|----------|--------|
| `RENTPROOF_BILLING_PROVIDER` | `yookassa` |
| `YOOKASSA_MODE` | `test` |
| `YOOKASSA_API_URL` | `https://api.yookassa.ru/v3` |
| `YOOKASSA_SHOP_ID` | *(test shop id)* |
| `YOOKASSA_SECRET_KEY` | *(test secret)* |
| `YOOKASSA_RETURN_URL` | `https://rentproof2.onrender.com/payments/return` |
| `RENTPROOF_PLATFORM_FEE_BPS` | `500` (optional, 5%) |
| `RENTPROOF_YOOKASSA_FAKE` | `0` |
| `YOOKASSA_WEBHOOK_SECRET` | optional custom header secret |

Redeploy after saving. Secrets must never be committed or placed in `NEXT_PUBLIC_*`.

## 3. HTTP notifications

In ЮKassa cabinet, point notifications to:

`https://rentproof2.onrender.com/api/payments/yookassa/webhook`

Events: `payment.succeeded`, `payment.canceled` (and refunds when used).

RentProof always **re-fetches** the payment via API before applying status. Browser return URL alone never activates a plan or marks rent paid.

## 4. Local development

```bash
cp .env.example .env
# either paste test keys, or:
RENTPROOF_YOOKASSA_FAKE=1
YOOKASSA_MODE=test
npm run dev
```

With fake mode, `/payments/return` shows buttons to simulate success/fail (no network).

## 5. Manual smoke checklist

1. Register / login.
2. `/pricing` → Pay Plus (test) → complete test card in ЮKassa (or fake succeed).
3. Confirm `/account/subscription` shows Plus + expiry.
4. Create booking → «Оплатить аренду» → succeed → `/account/payments`.
5. Confirm webhook (or return sync) did not double-activate.

## 6. Live mode

**Forbidden in this codebase path.** `YOOKASSA_MODE=live` is treated as live-forbidden; charges stay off until a future explicit change and owner approval.
