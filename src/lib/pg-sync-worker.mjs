import { parentPort, workerData } from "node:worker_threads";
import pg from "pg";

/** @type {import('pg').Pool | null} */
let pool = null;

/**
 * @param {string} connectionString
 */
function ensurePool(connectionString) {
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      ssl:
        connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * @param {string} sql
 */
function toPg(sql) {
  let n = 0;
  let out = "";
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "?") {
      n += 1;
      out += `$${n}`;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * @param {string} sql
 */
function splitStatements(sql) {
  const parts = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          current += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
}

/**
 * @param {SharedArrayBuffer} sab
 */
function release(sab) {
  const lock = new Int32Array(sab);
  Atomics.store(lock, 0, 1);
  Atomics.notify(lock, 0);
}

if (!parentPort) {
  throw new Error("pg-sync-worker must run as a worker thread");
}

parentPort.on("message", async (msg) => {
  /** @type {import('node:worker_threads').MessagePort} */
  const port = msg.port;
  const sab = msg.sab;
  try {
    let payload;

    if (msg.type === "end") {
      if (pool) {
        await pool.end();
        pool = null;
      }
      payload = { ok: true };
    } else {
      const connectionString = msg.connectionString || workerData?.connectionString;
      const clientPool = ensurePool(connectionString);

      if (msg.type === "ping") {
        await clientPool.query("SELECT 1 AS ok");
        payload = { ok: true };
      } else if (msg.type === "exec") {
        const statements = splitStatements(msg.sql ?? "");
        for (const statement of statements) {
          if (/^\s*PRAGMA\b/i.test(statement)) continue;
          await clientPool.query(statement);
        }
        payload = { ok: true, statements: statements.length };
      } else if (msg.type === "query") {
        const text = toPg(msg.sql ?? "");
        const result = await clientPool.query(text, msg.params ?? []);
        payload = {
          ok: true,
          rows: result.rows,
          rowCount: result.rowCount ?? 0,
        };
      } else {
        throw new Error(`Unknown pg worker op: ${msg.type}`);
      }
    }

    port.postMessage(payload);
  } catch (err) {
    port.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    port.close();
    if (sab) release(sab);
  }
});
