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

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      purpose TEXT NOT NULL CHECK (purpose IN ('subscription', 'rental')),
      status TEXT NOT NULL CHECK (status IN (
        'pending', 'waiting_for_capture', 'succeeded', 'canceled', 'failed'
      )),
      amount_kopecks INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      description TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'yookassa',
      provider_payment_id TEXT UNIQUE,
      confirmation_url TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      plan_id TEXT,
      rental_order_id TEXT,
      booking_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      error_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      succeeded_at TEXT,
      canceled_at TEXT
    );

    CREATE INDEX IF NOT EXISTS payments_user ON payments(user_id, created_at);
    CREATE INDEX IF NOT EXISTS payments_status ON payments(status, created_at);
    CREATE INDEX IF NOT EXISTS payments_provider ON payments(provider_payment_id);
    CREATE INDEX IF NOT EXISTS payments_rental ON payments(rental_order_id);

    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      payment_id TEXT REFERENCES payments(id),
      provider_event_id TEXT,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      processing_result TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS payment_events_payment ON payment_events(payment_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_once
      ON payment_events(provider_event_id)
      WHERE provider_event_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS payment_idempotency (
      idempotency_key TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      purpose TEXT NOT NULL,
      payment_id TEXT REFERENCES payments(id),
      request_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_orders (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
      renter_id TEXT NOT NULL REFERENCES users(id),
      owner_id TEXT NOT NULL REFERENCES users(id),
      listing_id TEXT NOT NULL REFERENCES listings(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      rental_amount_kopecks INTEGER NOT NULL,
      platform_fee_kopecks INTEGER NOT NULL,
      deposit_amount_kopecks INTEGER NOT NULL,
      total_amount_kopecks INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      payment_status TEXT NOT NULL CHECK (payment_status IN (
        'unpaid', 'pending', 'paid', 'canceled', 'refunded', 'failed'
      )),
      rental_status TEXT NOT NULL CHECK (rental_status IN (
        'created', 'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled'
      )),
      deal_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (deal_status IN (
        'not_applicable', 'payment_accepted', 'awaiting_deal_completion',
        'refund_in_progress', 'payout_pending', 'paid_out', 'safe_deal_unavailable'
      )),
      provider_payment_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS rental_orders_renter ON rental_orders(renter_id, created_at);
    CREATE INDEX IF NOT EXISTS rental_orders_owner ON rental_orders(owner_id, created_at);

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id),
      rental_order_id TEXT REFERENCES rental_orders(id),
      amount_kopecks INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'canceled', 'failed', 'unavailable')),
      provider_refund_id TEXT UNIQUE,
      reason TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS refunds_payment ON refunds(payment_id, created_at);

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      rental_order_id TEXT NOT NULL REFERENCES rental_orders(id),
      owner_id TEXT NOT NULL REFERENCES users(id),
      amount_kopecks INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      status TEXT NOT NULL CHECK (status IN (
        'draft', 'pending_admin', 'submitted', 'succeeded', 'failed', 'unavailable'
      )),
      provider_payout_id TEXT UNIQUE,
      admin_confirmed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS payouts_order ON payouts(rental_order_id, created_at);
  `);

  if (!hasColumn(db, "listings", "search_text")) {
    db.exec("ALTER TABLE listings ADD COLUMN search_text TEXT NOT NULL DEFAULT ''");
  }

  const subscriptionColumns: Array<[string, string]> = [
    ["status", "TEXT NOT NULL DEFAULT 'active'"],
    ["started_at", "TEXT"],
    ["expires_at", "TEXT"],
    ["payment_id", "TEXT"],
    ["renewal_status", "TEXT NOT NULL DEFAULT 'off'"],
    ["updated_at", "TEXT"],
  ];
  for (const [name, definition] of subscriptionColumns) {
    if (!hasColumn(db, "subscriptions", name)) {
      db.exec(`ALTER TABLE subscriptions ADD COLUMN ${name} ${definition}`);
    }
  }

  // Existing accounts default to verified=1 so production users are not locked out.
  // New registrations set email_verified=0 explicitly in registerUser.
  const userAuthColumns: Array<[string, string]> = [
    ["email_verified", "INTEGER NOT NULL DEFAULT 1"],
    ["email_verified_at", "TEXT"],
    ["account_status", "TEXT NOT NULL DEFAULT 'active'"],
  ];
  for (const [name, definition] of userAuthColumns) {
    if (!hasColumn(db, "users", name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS email_verifications_user ON email_verifications(user_id, created_at);

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets(user_id, created_at);

    CREATE TABLE IF NOT EXISTS legal_documents (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      version TEXT NOT NULL,
      title TEXT NOT NULL,
      body_md TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'retired')),
      created_at TEXT NOT NULL,
      published_at TEXT,
      UNIQUE(doc_type, version)
    );

    CREATE TABLE IF NOT EXISTS user_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      document_id TEXT REFERENCES legal_documents(id),
      document_version TEXT NOT NULL,
      accepted_at TEXT,
      revoked_at TEXT,
      consent_status TEXT NOT NULL CHECK (consent_status IN ('accepted', 'revoked', 'pending')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_consents_user ON user_consents(user_id, consent_type, created_at);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS customers_owner ON customers(owner_id, updated_at);
    CREATE INDEX IF NOT EXISTS customers_owner_search ON customers(owner_id, name);

    CREATE TABLE IF NOT EXISTS customer_interactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS customer_interactions_customer ON customer_interactions(customer_id, created_at);

    CREATE TABLE IF NOT EXISTS account_bans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('permanent', 'temporary', 'feature')),
      reason TEXT NOT NULL,
      features_json TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT,
      lifted_at TEXT,
      lifted_by TEXT REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS account_bans_user ON account_bans(user_id, created_at);
    CREATE INDEX IF NOT EXISTS account_bans_active ON account_bans(user_id, lifted_at, expires_at);

    CREATE TABLE IF NOT EXISTS admin_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_notes_user ON admin_notes(user_id, created_at);

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      assignee_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS support_tickets_status ON support_tickets(status, updated_at);

    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at);

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT REFERENCES users(id),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id TEXT PRIMARY KEY,
      audience TEXT NOT NULL DEFAULT 'owner',
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_notifications_created ON admin_notifications(created_at);
  `);

  const staffColumns: Array<[string, string]> = [
    ["staff_role", "TEXT"],
    ["display_name", "TEXT"],
    ["staff_permissions", "TEXT"],
    ["staff_disabled_at", "TEXT"],
    ["last_login_at", "TEXT"],
  ];
  for (const [name, definition] of staffColumns) {
    if (!hasColumn(db, "users", name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }

  const subscriptionGrantColumns: Array<[string, string]> = [
    ["source_kind", "TEXT NOT NULL DEFAULT 'paid'"],
    ["granted_by", "TEXT"],
    ["grant_reason", "TEXT"],
    ["grant_note", "TEXT"],
  ];
  for (const [name, definition] of subscriptionGrantColumns) {
    if (!hasColumn(db, "subscriptions", name)) {
      db.exec(`ALTER TABLE subscriptions ADD COLUMN ${name} ${definition}`);
    }
  }

  // Legacy is_admin=1 without staff_role → admin (owner assigned via OWNER_EMAIL bootstrap).
  db.prepare(
    `UPDATE users SET staff_role = 'admin' WHERE is_admin = 1 AND (staff_role IS NULL OR staff_role = '')`,
  ).run();
}

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}
