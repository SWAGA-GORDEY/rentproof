/**
 * Protected OWNER recovery CLI.
 * Usage:
 *   OWNER_RECOVERY_TOKEN=... OWNER_EMAIL=you@example.com npm run owner:recover
 * Never commit real tokens.
 */
import { getDb } from "../src/lib/db.ts";
import { recoverOwnerAccess } from "../src/lib/owner.ts";

getDb();
const email = process.env.OWNER_EMAIL?.trim() ?? "";
const token = process.env.OWNER_RECOVERY_TOKEN?.trim() ?? "";
const result = recoverOwnerAccess(email, token);
if (!result.ok) {
  console.error("owner_recovery_failed", result.reason);
  process.exit(1);
}
console.log("Owner access recovered for configured OWNER_EMAIL account.");
