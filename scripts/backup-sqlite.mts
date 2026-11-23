#!/usr/bin/env node
/**
 * Copy the live SQLite file to a timestamped backup.
 * Does not delete or migrate data. Safe to run against Render disk after shell access.
 *
 * Usage:
 *   RENTPROOF_DB_PATH=/data/rentproof.sqlite node --experimental-strip-types ./scripts/backup-sqlite.mts
 *   RENTPROOF_DB_PATH=./data/rentproof.sqlite RENTPROOF_BACKUP_DIR=./data/backups npm run db:backup
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const source = process.env.RENTPROOF_DB_PATH ?? path.join(process.cwd(), "data", "rentproof.sqlite");
const backupDir = process.env.RENTPROOF_BACKUP_DIR ?? path.join(path.dirname(source), "backups");

if (!existsSync(source)) {
  console.error("backup_failed", { reason: "missing_source" });
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(backupDir, `rentproof-${stamp}.sqlite`);
copyFileSync(source, dest);
const size = statSync(dest).size;
console.log(JSON.stringify({ ok: true, source: path.basename(source), dest, bytes: size }));
