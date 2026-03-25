import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initDb } from "../../src/storage/db.js";
import {
  insertSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
} from "../../src/storage/snapshots.js";
import { insertChange, getRecentChanges } from "../../src/storage/changes.js";
import {
  addTrackedAsin,
  listTrackedAsins,
  removeTrackedAsin,
} from "../../src/storage/tracked-asins.js";
import { insertPromo, listPromos } from "../../src/storage/promos.js";
import type { ProductSnapshot } from "../../src/schema/universal.js";

function makeSnapshot(
  overrides: Partial<ProductSnapshot> = {}
): ProductSnapshot {
  return {
    asin: "B0012ZQPKG",
    domain: "com",
    title: "Test Product",
    brand: "TestBrand",
    amazon_price: 19.99,
    new_price: 19.99,
    sales_rank: 5000,
    subcategory_ranks: [{ category_id: 3774511, category_name: "Zinc", rank: 3, is_primary: false }],
    rating: 4.5,
    review_count: 100,
    buy_box_seller_id: "ATVPDKIKX0DER",
    buy_box_is_amazon: true,
    buy_box_price: 19.99,
    images: ["img1.jpg"],
    features: ["Feature 1"],
    description: "A test product",
    parent_asin: "B0012PARENT",
    child_asins: ["B0012CHILD1"],
    variation_attributes: { Color: "Blue" },
    ...overrides,
  };
}

describe("storage", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = initDb(":memory:");
  });

  describe("snapshots", () => {
    it("inserts and retrieves a snapshot", () => {
      const snapshot = makeSnapshot();
      insertSnapshot(db, snapshot);
      const retrieved = getLatestSnapshot(db, "B0012ZQPKG", "com");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.asin).toBe("B0012ZQPKG");
      expect(retrieved!.amazon_price).toBe(19.99);
      expect(retrieved!.images).toEqual(["img1.jpg"]);
      expect(retrieved!.variation_attributes).toEqual({ Color: "Blue" });
    });

    it("returns null for non-existent ASIN", () => {
      expect(getLatestSnapshot(db, "NONEXIST", "com")).toBeNull();
    });

    it("returns latest snapshot when multiple exist", () => {
      insertSnapshot(db, makeSnapshot({ amazon_price: 10.0 }));
      insertSnapshot(db, makeSnapshot({ amazon_price: 20.0 }));
      const latest = getLatestSnapshot(db, "B0012ZQPKG", "com");
      expect(latest!.amazon_price).toBe(20.0);
    });

    it("retrieves snapshot history", () => {
      insertSnapshot(db, makeSnapshot({ amazon_price: 10.0 }));
      insertSnapshot(db, makeSnapshot({ amazon_price: 20.0 }));
      const history = getSnapshotHistory(db, "B0012ZQPKG", "com", 30);
      expect(history).toHaveLength(2);
    });
  });

  describe("changes", () => {
    it("inserts and retrieves changes", () => {
      insertChange(db, {
        asin: "B0012ZQPKG",
        domain: "com",
        field: "title",
        old_value: "Old Title",
        new_value: "New Title",
        severity: "critical",
        detected_at: new Date().toISOString(),
      });
      const changes = getRecentChanges(db, { days: 7 });
      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("title");
      expect(changes[0].severity).toBe("critical");
    });

    it("filters by severity", () => {
      insertChange(db, {
        asin: "B0012ZQPKG",
        domain: "com",
        field: "title",
        old_value: null,
        new_value: null,
        severity: "critical",
        detected_at: new Date().toISOString(),
      });
      insertChange(db, {
        asin: "B0012ZQPKG",
        domain: "com",
        field: "review_count",
        old_value: "100",
        new_value: "105",
        severity: "info",
        detected_at: new Date().toISOString(),
      });
      const critical = getRecentChanges(db, { severity: "critical" });
      expect(critical).toHaveLength(1);
    });
  });

  describe("tracked-asins", () => {
    it("adds and lists tracked ASINs", () => {
      addTrackedAsin(db, { asin: "B001", label: "Fairy Tales" });
      addTrackedAsin(db, { asin: "B002", label: "Fairy Tales" });
      const tracked = listTrackedAsins(db);
      expect(tracked).toHaveLength(2);
      expect(tracked[0].label).toBe("Fairy Tales");
    });

    it("deactivates tracked ASIN", () => {
      addTrackedAsin(db, { asin: "B001" });
      removeTrackedAsin(db, "B001");
      const tracked = listTrackedAsins(db, { activeOnly: true });
      expect(tracked).toHaveLength(0);
    });
  });

  describe("promos", () => {
    it("inserts and lists promos", () => {
      insertPromo(db, {
        asin: "B001",
        domain: "com",
        promo_type: "coupon",
        start_date: "2025-01-01",
        end_date: "2025-01-15",
        notes: "20% off",
      });
      const promos = listPromos(db, { asin: "B001" });
      expect(promos).toHaveLength(1);
      expect(promos[0].promo_type).toBe("coupon");
    });
  });
});
