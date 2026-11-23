# OWNER setup — Owner Control Center

**Primary URL:** https://rentproof2.onrender.com/owner  

Aliases (same panel, same server auth):

- https://rentproof2.onrender.com/admin  
- https://rentproof2.onrender.com/control-center  

Case typos like `/Admin` redirect to `/admin` (they used to look like a broken 404 panel).

## 1. Render env

In Render Dashboard → rentproof → Environment, set:

- `OWNER_EMAIL` = `gordey.tomozov@mail.ru` (must already exist as a registered RentProof account)
- Optional: `OWNER_RECOVERY_TOKEN` = long random secret (≥24 chars) for CLI recovery only

Do **not** put passwords into env vars for OWNER bootstrap.

`RENTPROOF_ADMIN_EMAIL` / `RENTPROOF_ADMIN_PASSWORD` are **deprecated and ignored**.

Keep `RENTPROOF_PAYMENTS_ENABLED=0` until YooKassa is ready.

## 2. First bind

1. Ensure the account `gordey.tomozov@mail.ru` already exists (register/login on the site if needed).
2. Confirm email if the flow requires it (bootstrap may mark verified when binding).
3. Set `OWNER_EMAIL=gordey.tomozov@mail.ru` and **redeploy** / restart the service.
4. Open https://rentproof2.onrender.com/login and sign in with that account.
5. OWNER is redirected to `/owner` (Owner Dashboard). Role badge: red crown **OWNER**.

If a non-staff user opens `/owner` / `/admin`, they see **`/staff-access-denied`** — an explicit denial, not a fake 404.

OWNER is not created via public registration and cannot be assigned through the admin UI or badges.

## 3. Recovery (emergency)

```bash
OWNER_EMAIL=gordey.tomozov@mail.ru OWNER_RECOVERY_TOKEN=... npm run owner:recover
```

This demotes other owners to admin and binds OWNER to `OWNER_EMAIL`. Never commit the token.

## 4. Staff

Only OWNER can open **Admin Management**, assign ADMIN / MODERATOR / SUPPORT, set permissions, disable or revoke staff. Staff cannot ban OWNER or self-escalate to OWNER.

## 5. Data durability (Render)

- SQLite: `RENTPROOF_DB_PATH=/data/rentproof.sqlite` on the persistent disk
- Uploads: `RENTPROOF_UPLOAD_DIR=/data/uploads`
- Do not wipe `/data` on deploy. There is no automatic user wipe seed in app start.

## 6. After restart

OWNER binding is re-checked on every session read from `OWNER_EMAIL` (idempotent). Changing `OWNER_EMAIL` to another user does **not** transfer ownership while an OWNER already exists — use recovery.
