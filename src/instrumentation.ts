export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { ensureAdminFromEnv } = await import("@/lib/ensure-admin");
  await ensureAdminFromEnv();
}
