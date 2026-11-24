export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  try {
    // Legacy RENTPROOF_ADMIN_* bootstrap is a no-op (fail-closed).
    const { ensureAdminFromEnv } = await import("@/lib/ensure-admin");
    await ensureAdminFromEnv();
    // Prefer OWNER_EMAIL bind on boot (idempotent; refuses transfer if another owner exists).
    const { ensureOwnerFromEnv } = await import("@/lib/owner");
    ensureOwnerFromEnv();
  } catch (err) {
    // Do not crash the whole Node process on a transient DB outage at boot.
    // Request handlers still surface DB errors; health checks report readiness.
    console.error("instrumentation_bootstrap_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
