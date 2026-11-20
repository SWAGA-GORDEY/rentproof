import { getDb } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";

export function consumeRateLimit(bucket: string, limit: number, windowMs: number, now = new Date()): void {
  const db = getDb();
  const since = new Date(now.getTime() - windowMs).toISOString();
  db.prepare("DELETE FROM request_limits WHERE bucket = ? AND attempted_at <= ?").run(bucket, since);
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM request_limits WHERE bucket = ? AND attempted_at > ?")
    .get(bucket, since) as { count: number } | undefined;
  if (Number(row?.count ?? 0) >= limit) {
    throw new RateLimitError();
  }
  db.prepare("INSERT INTO request_limits (bucket, attempted_at) VALUES (?, ?)").run(bucket, now.toISOString());
}
