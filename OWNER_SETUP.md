# OWNER setup — Developer Control Center

Production URL after deploy: https://rentproof2.onrender.com/admin

## 1. Render env

In Render Dashboard → rentproof → Environment, set:

- `OWNER_EMAIL` = email of your **existing** RentProof account (the one you already use to log in)
- Optional: `OWNER_RECOVERY_TOKEN` = long random secret (≥24 chars) for CLI recovery only

Do **not** put passwords into env vars for OWNER bootstrap.

Keep `RENTPROOF_PAYMENTS_ENABLED=0`.

## 2. First bind

1. Ensure the account already exists (register/login on the site if needed).
2. Confirm email if the flow requires it (bootstrap may mark verified when binding).
3. Set `OWNER_EMAIL` and **redeploy** / restart the service.
4. Open https://rentproof2.onrender.com/login and sign in with that account.
5. Open https://rentproof2.onrender.com/admin — you should see role **OWNER**.

OWNER is not created via public registration and cannot be assigned through the admin UI.

## 3. Recovery (emergency)

```bash
OWNER_EMAIL=you@example.com OWNER_RECOVERY_TOKEN=... npm run owner:recover
```

This demotes other owners to admin and binds OWNER to `OWNER_EMAIL`. Never commit the token.

## 4. Staff

Only OWNER can open **Admin Management**, assign ADMIN / MODERATOR / SUPPORT, set permissions, disable or revoke staff. Staff cannot ban OWNER or self-escalate to OWNER.

`admins.manage` is OWNER-only: it cannot be granted to ADMIN/MODERATOR/SUPPORT via the UI or API. Privilege elevation helpers that only flipped `is_admin` are disabled.

## 5. After restart

OWNER binding is re-checked on process start from `OWNER_EMAIL` (idempotent for the same account). SQLite lives on the Render disk (`/data`); staff roles and bans survive restarts. Changing `OWNER_EMAIL` to another user does **not** transfer ownership while an OWNER already exists — use recovery.
