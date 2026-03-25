import { describe, it, expect } from "vitest";
import { checkVariationChanges } from "../../src/analysis/variation-monitor.js";
import type { ProductSnapshot } from "../../src/schema/universal.js";

function makeSnapshot(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    asin: "B0012CHILD",
    domain: "com",
    title: "Test",
    brand: null,
    amazon_price: null,
    new_price: null,
    sales_rank: null,
    subcategory_ranks: [],
    rating: null,
    review_count: null,
    buy_box_seller_id: null,
    buy_box_is_amazon: null,
    buy_box_price: null,
    images: [],
    features: [],
    description: null,
    parent_asin: "B0012PARENT",
    child_asins: ["B0012CHILD1", "B0012CHILD2"],
    variation_attributes: { Color: "Blue", Size: "Large" },
    ...overrides,
  };
}

describe("variation-monitor", () => {
  it("returns empty when nothing changed", () => {
    const snapshot = makeSnapshot();
    expect(checkVariationChanges(snapshot, snapshot)).toEqual([]);
  });

  it("detects orphaned child (parent lost)", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ parent_asin: null });
    const alerts = checkVariationChanges(prev, curr);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_type).toBe("orphaned_child");
    expect(alerts[0].severity).toBe("critical");
  });

  it("detects parent changed", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ parent_asin: "B0012NEWPARENT" });
    const alerts = checkVariationChanges(prev, curr);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alert_type).toBe("parent_changed");
    expect(alerts[0].severity).toBe("critical");
  });

  it("detects children added", () => {
    const prev = makeSnapshot({ child_asins: ["A"] });
    const curr = makeSnapshot({ child_asins: ["A", "B"] });
    const alerts = checkVariationChanges(prev, curr);
    const added = alerts.find((a) => a.alert_type === "children_added");
    expect(added).toBeDefined();
    expect(added!.details).toContain("B");
  });

  it("detects children removed", () => {
    const prev = makeSnapshot({ child_asins: ["A", "B"] });
    const curr = makeSnapshot({ child_asins: ["A"] });
    const alerts = checkVariationChanges(prev, curr);
    const removed = alerts.find((a) => a.alert_type === "children_removed");
    expect(removed).toBeDefined();
    expect(removed!.severity).toBe("warning");
  });

  it("detects attribute drift with approved values", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      variation_attributes: { Color: "Red", Size: "Large" },
    });
    const alerts = checkVariationChanges(prev, curr, {
      Color: "Blue",
      Size: "Large",
    });
    const drift = alerts.find((a) => a.alert_type === "attribute_drift");
    expect(drift).toBeDefined();
    expect(drift!.details).toContain("Blue");
    expect(drift!.details).toContain("Red");
  });
});
