# RentProof Production launch (Render + Postgres)

**Do not deploy until the owner explicitly confirms.** This checklist is the launch path when no SQLite backup exists (documented in `SQLITE_BACKUP_RECOVERY.md`).

## Why Postgres

Free Render web services have **no Persistent Disk**. SQLite on `/data` cannot work. Managed Render Postgres is the durable store.

## Pre-flight (code)

1. Merge **PR #17** (`cursor/sqlite-to-postgres-f2a8`) into `master` (or deploy that branch).
2. Confirm tip includes OCC Postgres parity + `/api/health`.

## Render Dashboard (owner)

1. **New → PostgreSQL** (same region as the web service). Prefer a paid plan for backups; free DB expires in 30 days.
2. Open the web service → **Environment**:
   - `RENTPROOF_DB_DRIVER` = `postgres`
   - `DATABASE_URL` = Internal Database URL from the Postgres service (secret)
   - `RENTPROOF_REQUIRE_NONEMPTY_POSTGRES` = `0` for first empty bootstrap
   - `OWNER_EMAIL` = `gordey.tomozov@mail.ru`
   - `RENTPROOF_UPLOAD_DIR` = `/tmp/rentproof-uploads` (or object storage later)
   - `RENTPROOF_COOKIE_SECURE` = `1`
   - Keep mail / AI / payments secrets as already configured
3. **Health Check Path** = `/api/health`
4. Remove or ignore blank `RENTPROOF_DB_PATH` if it still points nowhere useful.
5. **Manual Deploy** after owner confirmation.

## First-run owner

1. Open `/register` and create an account with `gordey.tomozov@mail.ru`.
2. Verify email (or ensure mail is configured).
3. Restart / wait for `OWNER_EMAIL` bind → login → `/owner`.
4. Optionally set `RENTPROOF_REQUIRE_NONEMPTY_POSTGRES=1` after users exist.

## Backup

- Paid Render Postgres: enable PITR / logical exports in Dashboard.
- App: `DATABASE_URL=… npm run db:backup:pg` (pg_dump or JSON fallback).
- Free Postgres: no managed backups — upgrade or schedule external `pg_dump`.

## Rollback

- Keep PR #17 SQLite path available: `RENTPROOF_DB_DRIVER=sqlite` only if a real disk + file return.
- Or restore Postgres from a logical dump into a new instance and re-point `DATABASE_URL`.
