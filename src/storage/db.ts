import Database from "better-sqlite3";

export function initDb(dbPath?: string): Database.Database {
  const path = dbPath ?? process.env.KEEPA_DB_PATH ?? "./keepa.db";
  const db = new Database(path);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_asins (
      asin TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'com',
      label TEXT,
      parent_asin_expected TEXT,
      priority TEXT NOT NULL DEFAULT 'standard',
      active INTEGER NOT NULL DEFAULT 1,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (asin, domain)
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'com',
      snapshot_at TEXT NOT NULL DEFAULT (datetime('now')),
      amazon_price REAL,
      new_price REAL,
      sales_rank INTEGER,
      rating REAL,
      review_count INTEGER,
      buy_box_seller_id TEXT,
      buy_box_is_amazon INTEGER,
      buy_box_price REAL,
      title TEXT,
      images_json TEXT,
      features_json TEXT,
      description TEXT,
      parent_asin TEXT,
      child_asins_json TEXT,
      variation_attributes_json TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_asin_domain
      ON snapshots (asin, domain, snapshot_at DESC);

    CREATE TABLE IF NOT EXISTS changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'com',
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      severity TEXT NOT NULL DEFAULT 'info',
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      acknowledged INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_changes_asin_domain
      ON changes (asin, domain, detected_at DESC);

    CREATE TABLE IF NOT EXISTS promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'com',
      promo_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_promos_asin
      ON promos (asin, domain);

    CREATE TABLE IF NOT EXISTS approved_variation_values (
      asin TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'com',
      attribute_name TEXT NOT NULL,
      approved_value TEXT NOT NULL,
      PRIMARY KEY (asin, domain, attribute_name)
    );
  `);

  // Migrations for existing databases
  const columns = db.prepare("PRAGMA table_info(snapshots)").all() as { name: string }[];
  const columnNames = new Set(columns.map((c) => c.name));
  if (!columnNames.has("subcategory_ranks_json")) {
    db.exec("ALTER TABLE snapshots ADD COLUMN subcategory_ranks_json TEXT");
  }

  return db;
}
