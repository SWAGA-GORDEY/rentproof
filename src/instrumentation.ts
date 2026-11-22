export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  // Legacy RENTPROOF_ADMIN_* bootstrap is a no-op (fail-closed).
  const { ensureAdminFromEnv } = await import("@/lib/ensure-admin");
  await ensureAdminFromEnv();
  // Prefer OWNER_EMAIL bind on boot (idempotent; refuses transfer if another owner exists).
  const { ensureOwnerFromEnv } = await import("@/lib/owner");
  ensureOwnerFromEnv();
}
