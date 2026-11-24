# Production SQLite backup recovery

## Verdict (agent search, 2026-11-23)

**No Production SQLite backup was found** in any location this agent can read.

| Location | Result |
|----------|--------|
| `/workspace/data/rentproof.sqlite` | Valid SQLite, integrity ok, **0 users**, 0 listings/subscriptions |
| `/workspace/data/backups/*.sqlite` | Tiny/empty schema backup from local `db:backup` — **not Production** |
| `/tmp/**/*.sqlite` (300+) | Test fixtures only (`@example.test` / `@example.com`). Max ~15 synthetic users. One local owner-check DB with a single `@mail.ru` row from a **test run** (2 users, 0 listings, created same second) — **not a Production dump** |
| `/data` on this VM | Missing |
| Git history / LFS / releases | No `.sqlite` artifacts |
| GitHub Actions | No workflows / no artifacts |
| Agent store / secrets | No DB dumps; no app secrets with backup URLs |
| Live `https://rentproof2.onrender.com` | HTTP **500** (disk/path guards; free plan has no `/data`) |

Do **not** treat any `/tmp/rentproof-*/test.sqlite` file as Production.

## What that means

Without a file that once lived at `/data/rentproof.sqlite` on Render (or a copy of it), **existing Production accounts cannot be reconstructed** from this repository or agent disk.

PostgreSQL migration tooling (PR #17) still needs `SOURCE_SQLITE_PATH` pointing at a **real** backup before a data-preserving cutover.

## Where the owner can still look (outside this agent)

1. **Render Dashboard → Disks** for the web service: was a paid Persistent Disk ever attached? Any snapshot/export?
2. **Render Shell** on a still-running instance: `ls -la /data /app/data` (ephemeral `/app/data` is usually wiped on redeploy).
3. **Local machines / laptops** used during development: search `rentproof.sqlite`, `*.sqlite` in Downloads/Documents/Time Machine/cloud drive.
4. **Old CI/CD or manual `npm run db:backup` outputs** emailed or saved elsewhere.
5. **Paid Render Postgres** — only useful if data was already migrated (it was not, from this agent’s work).

If you find a candidate file, audit without pasting PII:

```bash
SOURCE_SQLITE_PATH=/path/to/candidate.sqlite npm run db:audit-sqlite
```

Expect: `users > 0`, non-test email domains, integrity `ok`. Then dry-run migrate into a **fresh** Postgres DB.

## Making the site work without a backup (intentional empty bootstrap)

Accept that **old accounts/subscriptions/listings are gone**, then bring the service back on **Render Postgres** (free web has no disk):

1. Create Render Postgres; copy Internal URL into web service `DATABASE_URL` (Dashboard secret — not Git).
2. Merge/deploy PR #17 (or equivalent).
3. Web service env:
   - `RENTPROOF_DB_DRIVER=postgres`
   - `DATABASE_URL=…` (secret)
   - **Do not** set `RENTPROOF_REQUIRE_NONEMPTY_POSTGRES=1` for the first empty bootstrap
   - Keep `OWNER_EMAIL` as the owner’s email
   - `RENTPROOF_UPLOAD_DIR=/tmp/rentproof-uploads` (or object storage later)
4. Manual Deploy.
5. Register the owner email again → `OWNER_EMAIL` bind restores Owner Control Center.
6. Tell users to re-register (password reset cannot resurrect missing rows).

This is **not** a silent empty Production DB: it is an explicit recovery mode after documented data loss. Prefer restoring a real SQLite backup if one appears.

## Agent will not

- Invent or promote test SQLite as Production
- Delete any SQLite file
- Change Production secrets
- Cut over Production without owner confirmation
- Migrate without a verified real source
