import { describe, it, expect } from "vitest";
import { analyzeBsrTrend } from "../../src/analysis/bsr-trend.js";
import type { ProductSnapshot } from "../../src/schema/universal.js";

function makeSnapshot(salesRank: number | null): ProductSnapshot {
  return {
    asin: "B0012ZQPKG",
    domain: "com",
    title: "Test",
    brand: null,
    amazon_price: null,
    new_price: null,
    sales_rank: salesRank,
    subcategory_ranks: [],
    rating: null,
    review_count: null,
    buy_box_seller_id: null,
    buy_box_is_amazon: null,
    buy_box_price: null,
    images: [],
    features: [],
    description: null,
    parent_asin: null,
    child_asins: [],
    variation_attributes: null,
  };
}

describe("bsr-trend", () => {
  it("returns stable when insufficient data", () => {
    const result = analyzeBsrTrend([], "B0012ZQPKG");
    expect(result.trend).toBe("stable");
    expect(result.percent_change).toBeNull();
  });

  it("returns stable for a single snapshot", () => {
    const result = analyzeBsrTrend([makeSnapshot(5000)], "B0012ZQPKG");
    expect(result.trend).toBe("stable");
  });

  it("detects improving trend (lower rank is better)", () => {
    const snapshots = [
      makeSnapshot(10000),
      makeSnapshot(9000),
      makeSnapshot(8000),
      makeSnapshot(7000),
    ];
    const result = analyzeBsrTrend(snapshots, "B0012ZQPKG");
    expect(result.trend).toBe("improving");
    expect(result.percent_change).toBeLessThan(0);
  });

  it("detects critical decline with consecutive worsening", () => {
    const snapshots = [
      makeSnapshot(5000),
      makeSnapshot(6000),
      makeSnapshot(7000),
      makeSnapshot(8000),
      makeSnapshot(9000),
    ];
    const result = analyzeBsrTrend(snapshots, "B0012ZQPKG", {
      criticalThreshold: 50,
    });
    // 80% increase = critical if consecutive
    expect(result.trend).toBe("critical_decline");
    expect(result.percent_change).toBe(80);
  });

  it("detects declining trend", () => {
    const snapshots = [
      makeSnapshot(5000),
      makeSnapshot(5500),
      makeSnapshot(6000),
      makeSnapshot(6500),
    ];
    const result = analyzeBsrTrend(snapshots, "B0012ZQPKG", {
      declineThreshold: 25,
    });
    expect(result.trend).toBe("declining");
  });

  it("filters out null sales_rank", () => {
    const snapshots = [
      makeSnapshot(5000),
      makeSnapshot(null),
      makeSnapshot(6000),
    ];
    const result = analyzeBsrTrend(snapshots, "B0012ZQPKG");
    expect(result.start_rank).toBe(5000);
    expect(result.end_rank).toBe(6000);
  });
});
