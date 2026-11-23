# RentProof data persistence (SQLite on Render)

## What stores accounts today

| Data | Store | Path / table |
|------|--------|--------------|
| Users, passwords (hashed), roles, plans | SQLite | `RENTPROOF_DB_PATH` → `/data/rentproof.sqlite` |
| Sessions | SQLite `sessions` | same file |
| Subscriptions, payments, bans, audit | SQLite | same file |
| Uploaded images | Disk | `RENTPROOF_UPLOAD_DIR` → `/data/uploads` |

There is **no Prisma/Drizzle**. Access is `getDb()` (`node:sqlite`). `seed()` only upserts categories and removes legacy **demo** listings — it never wipes real users.

## Why accounts can “disappear”

1. **Ephemeral filesystem** — if `RENTPROOF_DB_PATH` points inside the container (e.g. `./data/...`) instead of the Render **persistent disk** `/data`, every redeploy starts empty.
2. **Disk not attached / wiped** — Render disk must stay mounted at `/data` across deploys.
3. **Wrong service / new environment** — a new Render service gets a new empty disk.
4. **Not** caused by logout, GitHub pushes alone, or frontend-only deploys — unless the disk/path is wrong.

On Render boot, if `RENDER=true` and the DB path is not under `/data`, the app **refuses to start** (unless `RENTPROOF_ALLOW_EPHEMERAL_DB=1`).

## PostgreSQL

A full move to managed PostgreSQL is a **separate, approved** migration (new `DATABASE_URL`, dual-write/export, verify counts, cutover). This repo remains SQLite-on-disk until that project is explicitly authorized. Do **not** drop the SQLite disk beforehand.

## Backup

```bash
# Local / shell
RENTPROOF_DB_PATH=/data/rentproof.sqlite RENTPROOF_BACKUP_DIR=/data/backups npm run db:backup
```

Copies the live file to a timestamped backup. Verify restore offline before deleting anything. Render plan backup features should also be enabled in the dashboard when available.

## Required Render env (no secrets in Git)

- `RENTPROOF_DB_PATH=/data/rentproof.sqlite`
- `RENTPROOF_UPLOAD_DIR=/data/uploads`
- Persistent disk mounted at `/data`
- `OWNER_EMAIL=gordey.tomozov@mail.ru` (existing account email)
