# Developer Control Center — readiness report

Branch: `cursor/developer-control-center-f2a8`  
Base: `master` @ `a1c85d6`  
Admin URL (after deploy): https://rentproof2.onrender.com/admin

## Section readiness

| Section | Frontend | Backend | DB | RBAC | Tests | Est. |
|---------|----------|---------|----|------|-------|------|
| Dashboard | yes | yes | yes | staff gate | covered via dcc stats usage | 90% |
| Users | yes | yes | yes | users.* | ban/unban tests | 88% |
| Admin Management | yes | yes | yes | admins.manage / OWNER protect | RBAC tests | 90% |
| Listings | yes | yes | yes | listings.* | existing marketplace + moderate action | 85% |
| Subscriptions grant | yes | yes | yes | subscriptions.grant | grant/extend/expire/revoke tests | 92% |
| AI Control | yes | yes (stats/limits) | yes | ai.view | partial | 75% |
| Finance | yes | yes (potential vs paid) | yes | finance.view | partial | 80% |
| CRM & Support | yes | yes | yes | support.* | partial | 78% |
| Analytics | yes | yes | yes | analytics.view | partial | 80% |
| Legal Center | yes | draft edit only | yes | legal.* | draft stays DRAFT | 70% |
| Monitoring | yes | yes | yes | monitoring.view | partial | 72% |
| Audit Log | yes | yes (append-only) | yes | logs.view | audit writes in flows | 85% |
| Notifications | yes | yes | yes | staff | staff assign notifies | 75% |
| Settings | yes | non-secret keys | yes | settings.* | partial | 70% |
| OWNER bootstrap | n/a | OWNER_EMAIL | yes | yes | bootstrap + refuse transfer | 95% |

No section is marked 100%: production OWNER bind + Render deploy still require owner confirmation.

## Migrations / tables

Added via `src/lib/schema.ts`:

- users: `staff_role`, `display_name`, `staff_permissions`, `staff_disabled_at`, `last_login_at`
- subscriptions: `source_kind`, `granted_by`, `grant_reason`, `grant_note`
- `account_bans`, `admin_notes`, `support_tickets`, `support_ticket_messages`, `platform_settings`, `admin_notifications`

## Tests / build

- `npm test` → **40 passed**
- `npm run build` → **OK**

## Deploy notes (do not auto-merge)

1. Merge PR after your OK.
2. Set `OWNER_EMAIL` on Render to your existing account email.
3. Redeploy.
4. Login → `/admin`.
5. Keep payments off; keep legal DRAFT.

See `OWNER_SETUP.md`.
