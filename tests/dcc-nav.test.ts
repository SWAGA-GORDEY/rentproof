import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dccNav } from "@/lib/admin-nav";

describe("dcc navigation", () => {
  it("exposes Control Center routes including Security and Email", () => {
    assert.equal(dccNav.length, 18);
    const hrefs = dccNav.map((item) => item.href);
    assert.ok(hrefs.includes("/owner"));
    assert.ok(hrefs.includes("/owner/users"));
    assert.ok(hrefs.includes("/owner/security"));
    assert.ok(hrefs.includes("/owner/email"));
    assert.ok(hrefs.includes("/owner/payments"));
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("does not truncate mobile links with slice(0, 6)", () => {
    const shell = readFileSync(new URL("../src/components/dcc-shell.tsx", import.meta.url), "utf8");
    const mobile = readFileSync(new URL("../src/components/dcc-mobile-nav.tsx", import.meta.url), "utf8");
    assert.equal(shell.includes("slice(0, 6)"), false);
    assert.equal(mobile.includes("slice(0, 6)"), false);
    assert.match(shell, /DccMobileNav/);
    assert.match(mobile, /filtered\.map|links\.map/);
    assert.match(mobile, /Поиск раздела/);
  });
});
