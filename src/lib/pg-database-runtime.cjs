"use strict";

const { existsSync } = require("node:fs");
const path = require("node:path");
const { MessageChannel, receiveMessageOnPort, Worker } = require("node:worker_threads");

function resolveWorkerPath() {
  const fromEnv = process.env.RENTPROOF_PG_WORKER?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    path.join(__dirname, "pg-sync-worker.mjs"),
    path.join(process.cwd(), "pg-sync-worker.mjs"),
    path.join(process.cwd(), "src/lib/pg-sync-worker.mjs"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "pg-sync-worker.mjs not found. Set RENTPROOF_PG_WORKER or copy the worker next to the app root.",
  );
}

let worker = null;

function ensureWorker() {
  if (worker) return worker;
  const w = new Worker(resolveWorkerPath());
  // Do not keep the Node process alive solely for the idle PG worker (test exits / serverless).
  w.unref();
  w.on("error", () => {
    worker = null;
  });
  w.on("exit", () => {
    worker = null;
  });
  worker = w;
  return w;
}

function callWorker(op) {
  const sab = new SharedArrayBuffer(4);
  const lock = new Int32Array(sab);
  Atomics.store(lock, 0, 0);

  const { port1, port2 } = new MessageChannel();
  ensureWorker().postMessage({ ...op, sab, port: port2 }, [port2]);

  const waitResult = Atomics.wait(lock, 0, 0, 60_000);
  if (waitResult === "timed-out") {
    port1.close();
    throw new Error("PostgreSQL worker timed out");
  }

  const message = receiveMessageOnPort(port1);
  port1.close();
  const result = message?.message;
  if (!result) {
    throw new Error("PostgreSQL worker returned no result");
  }
  if (!result.ok) {
    throw new Error(result.error || "PostgreSQL worker error");
  }
  return result;
}

function openPostgresDatabase(connectionString) {
  const url = String(connectionString || "").trim();
  if (!url) {
    throw new Error("DATABASE_URL is empty. Set the Render Postgres Internal/External Database URL.");
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error("DATABASE_URL must be a postgres:// or postgresql:// connection string.");
  }

  callWorker({ type: "ping", connectionString: url });

  const prepare = (sql) => ({
    get(...params) {
      const result = callWorker({
        type: "query",
        connectionString: url,
        sql,
        params,
      });
      return result.rows?.[0];
    },
    all(...params) {
      const result = callWorker({
        type: "query",
        connectionString: url,
        sql,
        params,
      });
      return result.rows ?? [];
    },
    run(...params) {
      const result = callWorker({
        type: "query",
        connectionString: url,
        sql,
        params,
      });
      return {
        changes: result.rowCount ?? 0,
        lastInsertRowid: 0,
      };
    },
  });

  return {
    driver: "postgres",
    prepare,
    exec(sql) {
      callWorker({ type: "exec", connectionString: url, sql });
    },
    close() {
      try {
        callWorker({ type: "end", connectionString: url });
      } finally {
        if (worker) {
          void worker.terminate();
          worker = null;
        }
      }
    },
  };
}

module.exports = { openPostgresDatabase };
