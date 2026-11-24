import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RentproofDb } from "@/lib/sql";

/**
 * Load the CJS Postgres runtime via createRequire so Turbopack does not
 * analyze worker_threads / pg into the Next server graph (build breakage).
 */
const require = createRequire(import.meta.url);

export function openPostgresDatabase(connectionString: string): RentproofDb {
  const runtimePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "pg-database-runtime.cjs");
  // Dynamic path keeps the Worker implementation out of the App Router bundle.
  const runtime = require(/*turbopackIgnore: true*/ runtimePath) as {
    openPostgresDatabase: (url: string) => RentproofDb;
  };
  return runtime.openPostgresDatabase(connectionString);
}
