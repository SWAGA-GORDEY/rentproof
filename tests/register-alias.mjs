import { registerHooks } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.RENTPROOF_DB_PATH) {
  const dir = mkdtempSync(path.join(tmpdir(), "rentproof-"));
  process.env.RENTPROOF_DB_PATH = path.join(dir, "test.sqlite");
  process.env.RENTPROOF_UPLOAD_DIR = path.join(dir, "uploads");
}

// Payments tests use in-memory fake ЮKassa — never hit the network.
process.env.RENTPROOF_YOOKASSA_FAKE = "1";
process.env.YOOKASSA_MODE = "test";
process.env.RENTPROOF_BILLING_PROVIDER = "yookassa";
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";


const srcRoot = path.resolve(import.meta.dirname, "../src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = path.join(srcRoot, `${specifier.slice(2)}.ts`);
      return nextResolve(pathToFileURL(file).href, context);
    }
    return nextResolve(specifier, context);
  },
});
