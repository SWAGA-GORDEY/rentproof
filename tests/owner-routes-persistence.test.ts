import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dccNav } from "@/lib/admin-nav";
import {
  assertDurableDatabasePath,
  assertExistingProductionDatabase,
  assertPersistentDiskMount,
  databasePath,
  ensureDataSubdirectory,
  ensureSqliteParentDirectory,
  RENDER_DISK_MOUNT,
  RENDER_SQLITE_PATH,
} from "@/lib/db";
import { dccHref, OWNER_HOME, safeStaffNext } from "@/lib/staff-access";
import { seed } from "@/lib/seed";
import { getDb } from "@/lib/db";
import { uploadRoot } from "@/lib/images";

describe("owner routes + persistence guards", () => {
  it("next.config rewrites /owner and /control-center onto /admin (no case redirects)", () => {
    const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    assert.match(config, /rewrites\s*\(/);
    assert.match(config, /source:\s*"\/owner"/);
    assert.match(config, /destination:\s*"\/admin"/);
    assert.match(config, /source:\s*"\/control-center"/);
    assert.equal(config.includes("async redirects"), false);
    assert.equal(config.includes('source: "/Admin"'), false);
  });

  it("nav and dccHref prefer /owner primary URLs", () => {
    assert.equal(dccHref(), OWNER_HOME);
    assert.equal(dccHref("/users"), "/owner/users");
    assert.equal(dccHref("/admin/finance"), "/owner/finance");
    assert.ok(dccNav.every((item) => item.href.startsWith("/owner")));
    assert.ok(dccNav.some((item) => item.href === "/owner/security"));
    assert.ok(dccNav.some((item) => item.href === "/owner/email"));
  });

  it("safeStaffNext blocks open redirects", () => {
    assert.equal(safeStaffNext("https://evil.test", OWNER_HOME), OWNER_HOME);
    assert.equal(safeStaffNext("/owner/users", OWNER_HOME), "/owner/users");
    assert.equal(safeStaffNext("/admin", OWNER_HOME), "/admin");
  });

  it("durable path assertion fires only when enforced", () => {
    const prevRequire = process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
    const prevAllow = process.env.RENTPROOF_ALLOW_EPHEMERAL_DB;
    delete process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
    delete process.env.RENTPROOF_ALLOW_EPHEMERAL_DB;
    assert.doesNotThrow(() => assertDurableDatabasePath("./data/rentproof.sqlite"));

    process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK = "1";
    assert.throws(() => assertDurableDatabasePath("./data/rentproof.sqlite"));
    assert.doesNotThrow(() => assertDurableDatabasePath(RENDER_SQLITE_PATH));

    process.env.RENTPROOF_ALLOW_EPHEMERAL_DB = "1";
    assert.doesNotThrow(() => assertDurableDatabasePath("./data/temp.sqlite"));

    if (prevRequire === undefined) delete process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
    else process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK = prevRequire;
    if (prevAllow === undefined) delete process.env.RENTPROOF_ALLOW_EPHEMERAL_DB;
    else process.env.RENTPROOF_ALLOW_EPHEMERAL_DB = prevAllow;

    assert.match(databasePath(), /\.sqlite$/);
  });

  it("Render defaults ignore blank RENTPROOF_DB_PATH and refuse missing prod file", () => {
    const prevRender = process.env.RENDER;
    const prevDb = process.env.RENTPROOF_DB_PATH;
    const prevUpload = process.env.RENTPROOF_UPLOAD_DIR;
    const prevRequire = process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
    const prevAllowCreate = process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB;
    const prevDriver = process.env.RENTPROOF_DB_DRIVER;

    try {
      process.env.RENDER = "true";
      process.env.RENTPROOF_DB_PATH = "   ";
      process.env.RENTPROOF_DB_DRIVER = "sqlite";
      delete process.env.RENTPROOF_UPLOAD_DIR;
      delete process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
      delete process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB;

      assert.equal(databasePath(), RENDER_SQLITE_PATH);
      // Diskless free plans fall back to /tmp for images only; with /data present use /data/uploads.
      assert.match(uploadRoot(), /^(\/data\/uploads|\/tmp\/rentproof-uploads)$/);
      assert.doesNotThrow(() => assertDurableDatabasePath());
      assert.throws(() => assertExistingProductionDatabase("/data/definitely-missing-rentproof.sqlite"));
    } finally {
      if (prevRender === undefined) delete process.env.RENDER;
      else process.env.RENDER = prevRender;
      if (prevDb === undefined) delete process.env.RENTPROOF_DB_PATH;
      else process.env.RENTPROOF_DB_PATH = prevDb;
      if (prevUpload === undefined) delete process.env.RENTPROOF_UPLOAD_DIR;
      else process.env.RENTPROOF_UPLOAD_DIR = prevUpload;
      if (prevRequire === undefined) delete process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
      else process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK = prevRequire;
      if (prevAllowCreate === undefined) delete process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB;
      else process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB = prevAllowCreate;
      if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
      else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    }
  });

  it("seed does not delete arbitrary users", () => {
    const before = getDb().prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number };
    seed(getDb());
    const after = getDb().prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number };
    assert.equal(Number(after.c), Number(before.c));
  });

  it("never mkdir the /data mount; missing mount fails clearly", () => {
    const dbSource = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
    assert.equal(dbSource.includes("mkdirSync(path.dirname(file)"), false);
    assert.match(dbSource, /ensureSqliteParentDirectory/);
    assert.match(dbSource, /will not create/);

    const prevRequire = process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
    process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK = "1";

    // CI/dev containers typically have no Render disk at /data.
    if (!existsSync(RENDER_DISK_MOUNT)) {
      assert.throws(
        () => assertPersistentDiskMount(RENDER_DISK_MOUNT),
        /mount .*missing|will not create/i,
      );
      assert.throws(
        () => ensureSqliteParentDirectory(RENDER_SQLITE_PATH),
        /mount .*missing|will not create/i,
      );
      assert.throws(
        () => ensureDataSubdirectory("/data/uploads"),
        /mount .*missing|Cannot create/i,
      );
    }

    if (prevRequire === undefined) delete process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK;
    else process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK = prevRequire;
  });

  it("creates only nested dirs under an existing data root (not the mount itself)", () => {
    const root = mkdtempSync(path.join(tmpdir(), "rentproof-data-"));
    const nested = path.join(root, "uploads");
    ensureDataSubdirectory(nested);
    assert.equal(existsSync(nested), true);
    assert.equal(existsSync(root), true);

    const sqlite = path.join(root, "rentproof.sqlite");
    ensureSqliteParentDirectory(sqlite);
    // Parent is the temp root (already exists) — must not throw or wipe anything.
    writeFileSync(sqlite, "");
    assert.equal(existsSync(sqlite), true);
  });
});
