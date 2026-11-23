# RentProof: SQLite → Render Postgres migration

## Why

Render **free web services do not include Persistent Disk**. Without `/data`, SQLite cannot survive redeploys (`Persistent disk mount "/data" is missing` / earlier ephemeral path errors). Managed **Render Postgres** (`DATABASE_URL`) keeps accounts across deploys.

## Non-negotiables

- Do **not** delete the source SQLite file or disk (if any).
- Do **not** point Production at an empty Postgres database.
- Do **not** commit `DATABASE_URL` or passwords to Git.
- Do **not** Production Deploy / cut over without owner confirmation.
- SQLite persistence guards stay enabled until Postgres cutover is verified.
- Auth stays compatible: same `password_hash`, user `id`, email, sessions schema.

## Audit (local workspace copy)

Local `./data/rentproof.sqlite` in this environment is a **dev/test** file (often 0 users). Production counts must come from a **backup export** of the real SQLite (if one still exists on an old disk, shell snapshot, or prior `db:backup`).

Canonical production SQLite path (when disk existed): `/data/rentproof.sqlite`.

## Prepare Render Postgres

1. Render Dashboard → **New → Postgres**.
2. Prefer a **paid** plan for production (free Postgres expires in 30 days, no managed backups). Same region as the web service.
3. Copy the **Internal Database URL** into the web service env as `DATABASE_URL` (secret). Never commit it.
4. Do **not** set `RENTPROOF_DB_DRIVER=postgres` until migration counts match.

Optional Blueprint note: `render.yaml` can declare a `databases:` entry; live services created manually must still get `DATABASE_URL` linked in the Dashboard.

## Backup SQLite first

```bash
SOURCE=/path/to/rentproof.sqlite
RENTPROOF_DB_PATH=$SOURCE RENTPROOF_BACKUP_DIR=./data/backups npm run db:backup
```

Keep that file offline. Migration never deletes it.

## Dry-run then copy

```bash
# Dry-run (default): audit counts, apply schema only if confirm off — no row copy
SOURCE_SQLITE_PATH=./data/backups/rentproof-….sqlite \
DATABASE_URL='postgres://…' \
  npm run db:migrate:sqlite-to-pg

# Real copy (transactional). Target must be empty of users unless ALLOW_NONEMPTY=1
SOURCE_SQLITE_PATH=./data/backups/rentproof-….sqlite \
DATABASE_URL='postgres://…' \
RENTPROOF_MIGRATE_CONFIRM=1 \
  npm run db:migrate:sqlite-to-pg

# Re-check
SOURCE_SQLITE_PATH=./data/backups/rentproof-….sqlite \
DATABASE_URL='postgres://…' \
  npm run db:verify-counts
```

Cut over only when `users` (and other table) counts match.

## Production cutover (owner confirmation required)

`DATABASE_URL` alone does **not** switch the app — `RENTPROOF_DB_DRIVER` must be set to `postgres` explicitly.

Web service Environment:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Render Postgres URL (secret) |
| `RENTPROOF_DB_DRIVER` | `postgres` (required for cutover) |
| `RENTPROOF_REQUIRE_NONEMPTY_POSTGRES` | `1` (recommended) |
| `RENTPROOF_DB_PATH` | keep `/data/rentproof.sqlite` for rollback reference; unused while driver=postgres |
| `OWNER_EMAIL` | unchanged |

Then Manual Deploy. Smoke-test: login as a known user, subscription, listings/equipment, register a new user.

## Rollback

1. Set `RENTPROOF_DB_DRIVER=sqlite` and ensure a readable SQLite file is available again (restore backup to a mounted disk or paid disk).
2. Or point `DATABASE_URL` back to a restored Postgres PITR/logical backup.
3. Redeploy. Keep the pre-cutover SQLite backup indefinitely.

## Uploads on diskless plans

Account data lives in Postgres after cutover. Listing images still need a writable directory (`RENTPROOF_UPLOAD_DIR`). Without `/data`, set an explicit path or accept ephemeral `/tmp/rentproof-uploads` (images may vanish on restart — plan object storage later). Never store accounts in `/tmp`.
