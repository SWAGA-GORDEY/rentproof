import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sniffImage } from "@/lib/images";

describe("image sniffing", () => {
  it("accepts jpeg/png/webp magic bytes and rejects garbage", () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...Array(20).fill(0)]);
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, ...Array(20).fill(0)]);
    const webp = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...Array(8).fill(0),
    ]);
    assert.equal(sniffImage(jpeg), "image/jpeg");
    assert.equal(sniffImage(png), "image/png");
    assert.equal(sniffImage(webp), "image/webp");
    assert.equal(sniffImage(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), null);
    assert.equal(sniffImage(new Uint8Array(0)), null);
  });
});
