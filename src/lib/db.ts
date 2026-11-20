import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "@/lib/schema";
import { seed } from "@/lib/seed";

let database: DatabaseSync | null = null;

export function databasePath(): string {
  return process.env.RENTPROOF_DB_PATH ?? path.join(process.cwd(), "data", "rentproof.sqlite");
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const next = new DatabaseSync(file);
  migrate(next);
  database = next;
  seed(next);
  return next;
}

export function closeDb(): void {
  database?.close();
  database = null;
}
