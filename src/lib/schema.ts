import type { DatabaseSync } from "node:sqlite";

const USER_COLUMNS: Array<[string, string]> = [
  ["is_admin", "INTEGER NOT NULL DEFAULT 0"],
  ["blocked_at", "TEXT"],
  ["plan", "TEXT NOT NULL DEFAULT 'free'"],
];

export function migrate(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('landlord', 'tenant')),
      phone TEXT,
      city TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS login_attempts (
      email TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS login_attempts_email_time
      ON login_attempts(email, attempted_at);
  `);

  for (const [name, definition] of USER_COLUMNS) {
    if (!hasColumn(db, "users", name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      city TEXT NOT NULL,
      price_per_day INTEGER NOT NULL,
      deposit INTEGER NOT NULL,
      min_days INTEGER NOT NULL DEFAULT 1,
      condition_score INTEGER,
      condition_notes TEXT,
      specs_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
      rejection_reason TEXT,
      available_from TEXT,
      available_to TEXT,
      bookable INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0,
      search_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS listings_owner ON listings(owner_id, status);
    CREATE INDEX IF NOT EXISTS listings_catalog ON listings(status, category_id, city, price_per_day);

    CREATE TABLE IF NOT EXISTS listing_images (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      storage_name TEXT NOT NULL UNIQUE,
      mime TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS listing_images_listing ON listing_images(listing_id, sort_order);

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      renter_id TEXT NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days INTEGER NOT NULL,
      rent_amount INTEGER NOT NULL,
      deposit_amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS bookings_listing_status ON bookings(listing_id, status, start_date, end_date);
    CREATE INDEX IF NOT EXISTS bookings_renter ON bookings(renter_id, created_at);
    CREATE INDEX IF NOT EXISTS bookings_owner_lookup ON bookings(listing_id, renter_id, status);

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      subject_user_id TEXT NOT NULL REFERENCES users(id),
      listing_id TEXT NOT NULL REFERENCES listings(id),
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('published', 'hidden')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS reviews_listing ON reviews(listing_id, status);
    CREATE INDEX IF NOT EXISTS reviews_subject ON reviews(subject_user_id, status);

    CREATE TABLE IF NOT EXISTS ai_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      object_type TEXT NOT NULL,
      description TEXT NOT NULL,
      known_defects TEXT,
      status TEXT NOT NULL CHECK (status IN ('completed', 'unavailable', 'failed')),
      score INTEGER,
      confidence REAL,
      report_json TEXT,
      model TEXT,
      error_code TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ai_reports_user ON ai_reports(user_id, created_at);

    CREATE TABLE IF NOT EXISTS ai_report_images (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES ai_reports(id) ON DELETE CASCADE,
      storage_name TEXT NOT NULL UNIQUE,
      mime TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS condition_evidence (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      listing_id TEXT NOT NULL REFERENCES listings(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      phase TEXT NOT NULL CHECK (phase IN ('before', 'after')),
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS evidence_booking ON condition_evidence(booking_id, phase, created_at);

    CREATE TABLE IF NOT EXISTS condition_evidence_images (
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL REFERENCES condition_evidence(id) ON DELETE CASCADE,
      storage_name TEXT NOT NULL UNIQUE,
      mime TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions(user_id, created_at);

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'review', 'user')),
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'resolved', 'dismissed')),
      resolution TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS complaints_status ON complaints(status, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS complaints_open_once
      ON complaints(reporter_id, target_type, target_id)
      WHERE status = 'open';

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      meta TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS audit_actor ON audit_log(actor_id, created_at);
    CREATE INDEX IF NOT EXISTS audit_entity ON audit_log(entity_type, entity_id, created_at);

    CREATE TABLE IF NOT EXISTS request_limits (
      bucket TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS request_limits_bucket ON request_limits(bucket, attempted_at);
  `);

  if (!hasColumn(db, "listings", "search_text")) {
    db.exec("ALTER TABLE listings ADD COLUMN search_text TEXT NOT NULL DEFAULT ''");
  }
}

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}
