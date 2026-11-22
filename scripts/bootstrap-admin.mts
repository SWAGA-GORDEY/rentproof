/**
 * Deprecated. Creating/elevating admins from RENTPROOF_ADMIN_PASSWORD is disabled.
 * Use OWNER_EMAIL + existing account (see OWNER_SETUP.md) or:
 *   OWNER_EMAIL=... OWNER_RECOVERY_TOKEN=... npm run owner:recover
 */
console.error(
  "bootstrap-admin disabled: use OWNER_EMAIL for OWNER bind (OWNER_SETUP.md). RENTPROOF_ADMIN_* is ignored.",
);
process.exit(1);
