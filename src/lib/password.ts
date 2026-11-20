import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;
const KEY_LENGTH = 64;
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, KEY_LENGTH, scryptOptions())) as Buffer;
  return [
    "scrypt",
    String(COST),
    String(BLOCK_SIZE),
    String(PARALLELISM),
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, cost, blockSize, parallelism, salt, expectedHash] = parts;
  if (!cost || !blockSize || !parallelism || !salt || !expectedHash) {
    return false;
  }

  const expected = Buffer.from(expectedHash, "base64url");
  let actual: Buffer;
  try {
    actual = (await scrypt(password, Buffer.from(salt, "base64url"), expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelism),
      maxmem: 128 * 1024 * 1024,
    })) as Buffer;
  } catch {
    return false;
  }

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

function scryptOptions() {
  return {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: 128 * 1024 * 1024,
  };
}
