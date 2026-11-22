# Developer Control Center — readiness report

Branch: `cursor/developer-control-center-f2a8`  
Base: `master` @ `a1c85d6`  
Admin URL (after deploy): https://rentproof2.onrender.com/admin

## Pre-merge audit (final)

Audit covered RBAC/OWNER, admin APIs, privilege escalation, bans, staff, subscriptions, audit log, PII, migrations, restart, secrets, Render. Fixes landed on this branch before merge.

| Check | Status |
|------|--------|
| RBAC + OWNER protection | Pass — OWNER via `OWNER_EMAIL`; cannot ban/demote OWNER; staff mgmt OWNER-only |
| Admin API gates | Pass — DCC + legacy admin actions use `requireStaff(permission)` |
| Self-escalation | Pass — `admins.manage` OWNER-only; assignable perms strip that cap; `promoteExistingUser` + legacy `RENTPROOF_ADMIN_*` fail-closed |
| User bans | Pass — permanent/temporary/feature; expired temps auto-cleared; feature bans enforced on listings/bookings/ai/crm |
| ADMIN assign/revoke | Pass — OWNER-only lib + UI |
| PLUS/PRO grant/extend/revoke | Pass — `admin_granted` / promotional / referral; no fake payments |
| Auto expiry | Pass — history kept; user notified; FREE row with `source_kind` |
| Subscription history | Pass — revoke/expire update status, insert new rows |
| Audit log | Pass — append-only; no email in actor label on audit page |
| PII | Pass — secrets blocked in platform settings; AI probe never returns key |
| DB migrations | Pass — additive `ALTER` / `CREATE IF NOT EXISTS`; legacy `is_admin` → `staff_role=admin` |
| Restart | Pass — schema + OWNER bootstrap on boot; data on `/data` |
| Secrets in frontend/Git | Pass — only `.env.example` placeholders; no live secrets committed |
| Render | Pass — Docker `/data`, `render.yaml` `OWNER_EMAIL` sync:false |

**Merge and production deploy remain blocked until Michael confirms.**

## Section readiness

| Section | Frontend | Backend | DB | RBAC | Tests | Est. |
|--------|----------|---------|----|------|-------|------|
| Dashboard | yes | yes | yes | staff gate | covered via dcc stats usage | 95% |
| Users | yes | yes | yes | users.* | ban/unban/feature/expiry | 95% |
| Admin Management | yes | yes | yes | OWNER-only `admins.manage` | RBAC + escalation tests | 96% |
| Listings | yes | yes | yes | listings.* | marketplace + moderate | 90% |
| Subscriptions grant | yes | yes | yes | subscriptions.grant | grant/extend/expire/revoke | 95% |
| AI Control | yes | yes (stats/limits) | yes | ai.view | probe gated | 85% |
| Finance | yes | yes (potential vs paid) | yes | finance.view | partial | 80% |
| CRM & Support | yes | yes | yes | support.* | feature ban on CRM | 85% |
| Analytics | yes | yes | yes | analytics.view | partial | 80% |
| Legal Center | yes | draft edit only | yes | legal.* | draft stays DRAFT | 75% |
| Monitoring | yes | yes | yes | monitoring.view | partial | 75% |
| Audit Log | yes | yes (append-only) | yes | logs.view | audit writes in flows | 90% |
| Notifications | yes | yes | yes | staff | staff assign notifies | 80% |
| Settings | yes | non-secret keys | yes | settings.* | secret key reject | 85% |
| OWNER bootstrap | n/a | OWNER_EMAIL | yes | yes | bootstrap + refuse transfer | 98% |

No section is marked 100%: production OWNER bind + Render deploy still require owner confirmation.

## Migrations / tables

Added via `src/lib/schema.ts` (compatible with existing users):

- users: `staff_role`, `display_name`, `staff_permissions`, `staff_disabled_at`, `last_login_at`
- subscriptions: `source_kind`, `granted_by`, `grant_reason`, `grant_note`
- `account_bans`, `admin_notes`, `support_tickets`, `support_ticket_messages`, `platform_settings`, `admin_notifications`
- Legacy `is_admin=1` without `staff_role` → `admin` (OWNER still only via `OWNER_EMAIL`)

## Tests / build

Re-run after audit fixes; see latest CI / local `npm test` + `npm run build`.

## Deploy notes (do not auto-merge)

1. Merge PR only after your OK.
2. Set `OWNER_EMAIL` on Render to your existing account email (see `OWNER_SETUP.md`).
3. Redeploy / restart so bootstrap runs.
4. Login → `/admin`.
5. Keep payments off; keep legal DRAFT.
