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
