export type SqlValue = string | number | bigint | null | Uint8Array;

export type RunResult = { changes: number; lastInsertRowid: number | bigint };

export interface SqlStatement {
  run(...params: SqlValue[]): RunResult;
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
}

export interface RentproofDb {
  readonly driver: "sqlite" | "postgres";
  prepare(sql: string): SqlStatement;
  exec(sql: string): void;
  close(): void;
}

/** Convert SQLite `?` placeholders to Postgres `$1..$n` (ignores `?` inside quotes). */
export function sqlitePlaceholdersToPostgres(sql: string): string {
  let out = "";
  let i = 0;
  let index = 0;
  let quote: "'" | '"' | null = null;
  while (i < sql.length) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[i + 1];
          i += 2;
          continue;
        }
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "?") {
      index += 1;
      out += `$${index}`;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

export function splitSqlStatements(sql: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
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
