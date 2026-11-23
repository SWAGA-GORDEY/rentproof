# Deploy Owner Control Center to Render (manual)

## Root cause of production `/owner` 404

| Fact | Value |
|------|--------|
| Production tip (as of diagnosis) | `master` = `ac27094` (Resend PR #10) |
| `/admin` on prod | **200** (DCC from earlier merge) |
| `/owner`, `/control-center` on prod | **404** — routes/rewrites only exist in unmerged stack |
| PR stack | **#12 → #13 → #15** still **OPEN**, not on `master` |

This is **not** primarily an `OWNER_EMAIL` bug. Until the stack is merged and Render redeploys, `/owner` cannot exist.

## Merge order (owner approval required)

1. Merge [PR #12](https://github.com/SWAGA-GORDEY/rentproof/pull/12) into `master`
2. Merge [PR #13](https://github.com/SWAGA-GORDEY/rentproof/pull/13)
3. Merge [PR #15](https://github.com/SWAGA-GORDEY/rentproof/pull/15) (includes `/owner` rewrites + OCC)

Or squash-merge the tip of `cursor/owner-ultimate-dcc-f2a8` after review.

**Do not** force-push. **Do not** wipe the `/data` disk.

## Render Environment (set in Dashboard — agent does not change prod)

| Key | Value |
|-----|--------|
| `OWNER_EMAIL` | `gordey.tomozov@mail.ru` (must already be a registered user) |
| `RENTPROOF_DB_PATH` | `/data/rentproof.sqlite` (**must not be blank** — blank overrides Docker default and caused HTTP 500) |
| `RENTPROOF_UPLOAD_DIR` | `/data/uploads` |
| `MAIL_DRIVER` / `RESEND_API_KEY` / `MAIL_FROM` | keep existing Resend setup |
| Persistent disk | mount `/data` (see `render.yaml`) |

If `RENTPROOF_DB_PATH` exists in the Dashboard as an empty variable, either set it to `/data/rentproof.sqlite` or **delete** the empty key so the Docker/`RENDER=true` default applies.

**Persistent Disk (required):**

- Disk attached to this **same** web service (not a different service).
- **Mount Path** = `/data` (exact).
- Do not delete/reformat the disk. Existing SQLite must stay at `/data/rentproof.sqlite`.
- The app will **not** `mkdir /data` (that caused `EACCES`). If logs say the mount is missing, fix the Dashboard disk mount — do not invent `/data` in the container.

After changing env: **Manual Deploy / Restart**.

## Verify after deploy

1. https://rentproof2.onrender.com/owner → login with `?next=/owner` (anonymous)
2. Login as `gordey.tomozov@mail.ru` → Owner Dashboard (dark OCC)
3. https://rentproof2.onrender.com/control-center → same panel
4. https://rentproof2.onrender.com/admin → same panel
5. Normal user → `/staff-access-denied`
6. Confirm users still exist (no empty DB)

## Commit to publish

Tip of stack: branch `cursor/owner-ultimate-dcc-f2a8` (see latest SHA on PR #15).
