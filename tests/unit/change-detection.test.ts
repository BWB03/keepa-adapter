import { describe, it, expect } from "vitest";
import { detectChanges } from "../../src/analysis/change-detection.js";
import type { ProductSnapshot } from "../../src/schema/universal.js";

function makeSnapshot(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    asin: "B0012ZQPKG",
    domain: "com",
    title: "Test Product",
    brand: "TestBrand",
    amazon_price: 19.99,
    new_price: 19.99,
    sales_rank: 5000,
    subcategory_ranks: [],
    rating: 4.5,
    review_count: 100,
    buy_box_seller_id: "ATVPDKIKX0DER",
    buy_box_is_amazon: true,
    buy_box_price: 19.99,
    images: ["img1.jpg", "img2.jpg"],
    features: ["Feature 1", "Feature 2"],
    description: "A test product",
    parent_asin: "B0012PARENT",
    child_asins: [],
    variation_attributes: null,
    ...overrides,
  };
}

describe("change-detection", () => {
  it("returns empty array when nothing changed", () => {
    const snapshot = makeSnapshot();
    expect(detectChanges(snapshot, snapshot)).toEqual([]);
  });

  it("detects title change as critical", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ title: "New Title" });
    const changes = detectChanges(prev, curr);
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("title");
    expect(changes[0].severity).toBe("critical");
  });

  it("detects buy box seller change as critical", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ buy_box_seller_id: "OTHER_SELLER" });
    const changes = detectChanges(prev, curr);
    const bbChange = changes.find((c) => c.field === "buy_box_seller_id");
    expect(bbChange).toBeDefined();
    expect(bbChange!.severity).toBe("critical");
  });

  it("detects parent ASIN loss as critical", () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ parent_asin: null });
    const changes = detectChanges(prev, curr);
    const parentChange = changes.find((c) => c.field === "parent_asin");
    expect(parentChange).toBeDefined();
    expect(parentChange!.severity).toBe("critical");
  });

  it("detects sales rank worsening >20% as warning", () => {
    const prev = makeSnapshot({ sales_rank: 5000 });
    const curr = makeSnapshot({ sales_rank: 7000 }); // 40% worse
    const changes = detectChanges(prev, curr);
    const rankChange = changes.find((c) => c.field === "sales_rank");
    expect(rankChange).toBeDefined();
    expect(rankChange!.severity).toBe("warning");
  });

  it("ignores sales rank change <20%", () => {
    const prev = makeSnapshot({ sales_rank: 5000 });
    const curr = makeSnapshot({ sales_rank: 5500 }); // 10% worse
    const changes = detectChanges(prev, curr);
    const rankChange = changes.find((c) => c.field === "sales_rank");
    expect(rankChange).toBeUndefined();
  });

  it("detects amazon price change >10% as warning", () => {
    const prev = makeSnapshot({ amazon_price: 20.0 });
    const curr = makeSnapshot({ amazon_price: 15.0 }); // 25% change
    const changes = detectChanges(prev, curr);
    const priceChange = changes.find((c) => c.field === "amazon_price");
    expect(priceChange).toBeDefined();
    expect(priceChange!.severity).toBe("warning");
  });

  it("detects rating drop as warning", () => {
    const prev = makeSnapshot({ rating: 4.5 });
    const curr = makeSnapshot({ rating: 4.2 });
    const changes = detectChanges(prev, curr);
    const ratingChange = changes.find((c) => c.field === "rating");
    expect(ratingChange).toBeDefined();
    expect(ratingChange!.severity).toBe("warning");
  });

  it("detects review count change as info", () => {
    const prev = makeSnapshot({ review_count: 100 });
    const curr = makeSnapshot({ review_count: 105 });
    const changes = detectChanges(prev, curr);
    const reviewChange = changes.find((c) => c.field === "review_count");
    expect(reviewChange).toBeDefined();
    expect(reviewChange!.severity).toBe("info");
  });

  it("detects image change as warning", () => {
    const prev = makeSnapshot({ images: ["a.jpg"] });
    const curr = makeSnapshot({ images: ["b.jpg"] });
    const changes = detectChanges(prev, curr);
    const imgChange = changes.find((c) => c.field === "images");
    expect(imgChange).toBeDefined();
    expect(imgChange!.severity).toBe("warning");
  });

  it("detects subcategory rank worsening >30% as warning", () => {
    const prev = makeSnapshot({
      subcategory_ranks: [
        { category_id: 100, category_name: "Zinc", rank: 3, is_primary: false },
      ],
    });
    const curr = makeSnapshot({
      subcategory_ranks: [
        { category_id: 100, category_name: "Zinc", rank: 5, is_primary: false },
      ],
    });
    const changes = detectChanges(prev, curr);
    const subcatChange = changes.find((c) => c.field.startsWith("subcategory_rank:"));
    expect(subcatChange).toBeDefined();
    expect(subcatChange!.field).toBe("subcategory_rank:Zinc");
    expect(subcatChange!.severity).toBe("warning");
  });

  it("ignores small subcategory rank changes", () => {
    const prev = makeSnapshot({
      subcategory_ranks: [
        { category_id: 100, category_name: "Zinc", rank: 10, is_primary: false },
      ],
    });
    const curr = makeSnapshot({
      subcategory_ranks: [
        { category_id: 100, category_name: "Zinc", rank: 12, is_primary: false },
      ],
    });
    const changes = detectChanges(prev, curr);
    const subcatChange = changes.find((c) => c.field.startsWith("subcategory_rank:"));
    expect(subcatChange).toBeUndefined();
  });
});
