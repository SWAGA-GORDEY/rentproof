/**
 * Legacy admin bootstrap via RENTPROOF_ADMIN_EMAIL / RENTPROOF_ADMIN_PASSWORD.
 *
 * Disabled for Developer Control Center: OWNER is bound only through OWNER_EMAIL
 * (existing account, no password in env). Creating or elevating admins from a
 * password env var is a privilege-escalation risk and is intentionally a no-op.
 */
export async function ensureAdminFromEnv(): Promise<void> {
  const legacyEmail = process.env.RENTPROOF_ADMIN_EMAIL?.trim() ?? "";
  const legacyPassword = process.env.RENTPROOF_ADMIN_PASSWORD ?? "";
  if (legacyEmail || legacyPassword) {
    console.warn(
      "ensure_admin_from_env_disabled: use OWNER_EMAIL for OWNER bootstrap; RENTPROOF_ADMIN_* is ignored",
    );
  }
}
