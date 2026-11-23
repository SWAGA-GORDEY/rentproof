import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dccNav } from "@/lib/admin-nav";

describe("dcc navigation", () => {
  it("exposes all 16 Control Center routes", () => {
    assert.equal(dccNav.length, 16);
    const hrefs = dccNav.map((item) => item.href);
    assert.deepEqual(hrefs, [
      "/admin",
      "/admin/users",
      "/admin/staff",
      "/admin/listings",
      "/admin/subscriptions",
      "/admin/ai",
      "/admin/finance",
      "/admin/support",
      "/admin/analytics",
      "/admin/legal",
      "/admin/monitoring",
      "/admin/audit",
      "/admin/notifications",
      "/admin/settings",
      "/admin/reports",
      "/admin/payments",
    ]);
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
