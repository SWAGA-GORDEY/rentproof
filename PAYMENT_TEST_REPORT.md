# Payment Test Report — RentProof

Date: 2026-11-22 (UTC) / Asia/Yekaterinburg  
Runner: `RENTPROOF_YOOKASSA_FAKE=1 YOOKASSA_MODE=test npm test`

## Automated results

**27/27 passed** (auth + marketplace + `tests/payments.test.ts`).

| # | Scenario | Result |
|---|----------|--------|
| 1 | Successful test subscription (Plus) | PASS — plan activates only after fake succeed |
| 2 | Failed / canceled subscription | PASS — plan stays free |
| 3 | Cancel path via fail | PASS (status `canceled`) |
| 4 | Duplicate webhook / re-apply | PASS — `already_applied` / idempotent |
| 5 | Amount mismatch | PASS — status stays pending, plan not activated |
| 6 | Currency mismatch | PASS — pending, no activation |
| 7 | Repeat pay button (idempotent open payment) | PASS — `reused: true` |
| 8 | Rental payment from server quote | PASS |
| 9 | Foreign user cannot pay / see payment | PASS — `ForbiddenError` / null |
| 10 | Persist after DB reopen | PASS |
| 11 | Unknown webhook payment | PASS — `unknown_payment` |
| 12 | Refund | Covered by API `createRefundForPayment` (fake succeeds); admin UI lists refunds — no separate live shop call |

## Not run against real ЮKassa test shop

No shop credentials in this environment. After Michael sets Render secrets:

1. Pay Plus with ЮKassa test card.
2. Confirm webhook delivery to `/api/payments/yookassa/webhook`.
3. Pay a booking rental.
4. Attempt cancel in cabinet if supported.
5. Optional admin refund via API helper.

## Production build

Run `npm run build` on the branch before merge (see CI / local).
