import type Database from "better-sqlite3";
import type { ProductSnapshot } from "../schema/universal.js";

export function insertSnapshot(
  db: Database.Database,
  snapshot: ProductSnapshot,
  rawJson?: string
): number {
  const stmt = db.prepare(`
    INSERT INTO snapshots (
      asin, domain, amazon_price, new_price, sales_rank, subcategory_ranks_json,
      rating, review_count, buy_box_seller_id, buy_box_is_amazon, buy_box_price,
      title, images_json, features_json, description,
      parent_asin, child_asins_json, variation_attributes_json, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const result = stmt.run(
    snapshot.asin,
    snapshot.domain,
    snapshot.amazon_price,
    snapshot.new_price,
    snapshot.sales_rank,
    JSON.stringify(snapshot.subcategory_ranks),
    snapshot.rating,
    snapshot.review_count,
    snapshot.buy_box_seller_id,
    snapshot.buy_box_is_amazon === null ? null : snapshot.buy_box_is_amazon ? 1 : 0,
    snapshot.buy_box_price,
    snapshot.title,
    JSON.stringify(snapshot.images),
    JSON.stringify(snapshot.features),
    snapshot.description,
    snapshot.parent_asin,
    JSON.stringify(snapshot.child_asins),
    snapshot.variation_attributes ? JSON.stringify(snapshot.variation_attributes) : null,
    rawJson ?? null
  );

  return result.lastInsertRowid as number;
}

export function getLatestSnapshot(
  db: Database.Database,
  asin: string,
  domain = "com"
): ProductSnapshot | null {
  const row = db
    .prepare(
      `SELECT * FROM snapshots WHERE asin = ? AND domain = ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(asin, domain) as Record<string, unknown> | undefined;

  if (!row) return null;
  return rowToSnapshot(row);
}

export function getSnapshotHistory(
  db: Database.Database,
  asin: string,
  domain = "com",
  days = 30
): ProductSnapshot[] {
  const rows = db
    .prepare(
      `SELECT * FROM snapshots WHERE asin = ? AND domain = ?
       AND snapshot_at >= datetime('now', '-' || ? || ' days')
       ORDER BY snapshot_at ASC`
    )
    .all(asin, domain, days) as Record<string, unknown>[];

  return rows.map(rowToSnapshot);
}

function rowToSnapshot(row: Record<string, unknown>): ProductSnapshot {
  return {
    asin: row.asin as string,
    domain: row.domain as string,
    title: (row.title as string) ?? null,
    brand: null, // not stored separately
    amazon_price: (row.amazon_price as number) ?? null,
    new_price: (row.new_price as number) ?? null,
    sales_rank: (row.sales_rank as number) ?? null,
    subcategory_ranks: safeJsonParse(row.subcategory_ranks_json as string, []),
    rating: (row.rating as number) ?? null,
    review_count: (row.review_count as number) ?? null,
    buy_box_seller_id: (row.buy_box_seller_id as string) ?? null,
    buy_box_is_amazon:
      row.buy_box_is_amazon === null
        ? null
        : (row.buy_box_is_amazon as number) === 1,
    buy_box_price: (row.buy_box_price as number) ?? null,
    images: safeJsonParse(row.images_json as string, []),
    features: safeJsonParse(row.features_json as string, []),
    description: (row.description as string) ?? null,
    parent_asin: (row.parent_asin as string) ?? null,
    child_asins: safeJsonParse(row.child_asins_json as string, []),
    variation_attributes: safeJsonParse(
      row.variation_attributes_json as string,
      null
    ),
  };
}

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
