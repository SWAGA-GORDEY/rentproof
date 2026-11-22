import { registerHooks } from "node:module";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.RENTPROOF_DB_PATH) {
  const dir = mkdtempSync(path.join(tmpdir(), "rentproof-"));
  process.env.RENTPROOF_DB_PATH = path.join(dir, "test.sqlite");
  process.env.RENTPROOF_UPLOAD_DIR = path.join(dir, "uploads");
}

// Payments tests use in-memory fake ЮKassa — never hit the network.
// Production keeps RENTPROOF_PAYMENTS_ENABLED unset/off until the owner opts in.
process.env.RENTPROOF_PAYMENTS_ENABLED = "1";
process.env.RENTPROOF_YOOKASSA_FAKE = "1";
process.env.YOOKASSA_MODE = "test";
process.env.RENTPROOF_BILLING_PROVIDER = "yookassa";
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
process.env.RENTPROOF_LISTING_AUTO_PUBLISH = process.env.RENTPROOF_LISTING_AUTO_PUBLISH || "1";


const srcRoot = path.resolve(import.meta.dirname, "../src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = path.join(srcRoot, specifier.slice(2));
      const candidates = [`${base}.ts`, path.join(base, "index.ts"), `${base}.tsx`, path.join(base, "index.tsx")];
      const file = candidates.find((candidate) => existsSync(candidate));
      if (!file) {
        throw new Error(`Cannot resolve alias ${specifier}`);
      }
      return nextResolve(pathToFileURL(file).href, context);
    }
    return nextResolve(specifier, context);
  },
});
