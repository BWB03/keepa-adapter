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
    monthly_sold: 10000,
    list_price: 25.00,
    offer_count_new: 5,
    offer_count_used: 2,
    offer_count_fba: 2,
    offer_count_fbm: 1,
    out_of_stock_percentage_30: 10,
    out_of_stock_percentage_90: 15,
    is_sns: true,
    frequently_bought_together: [],
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

  it("does not flag image change when previous images are empty", () => {
    const prev = makeSnapshot({ images: [] });
    const curr = makeSnapshot({ images: ["a.jpg"] });
    const changes = detectChanges(prev, curr);
    const imgChange = changes.find((c) => c.field === "images");
    expect(imgChange).toBeUndefined();
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

  it("detects monthly_sold drop >30% as warning", () => {
    const prev = makeSnapshot({ monthly_sold: 10000 });
    const curr = makeSnapshot({ monthly_sold: 5000 }); // 50% drop
    const changes = detectChanges(prev, curr);
    const soldChange = changes.find((c) => c.field === "monthly_sold");
    expect(soldChange).toBeDefined();
    expect(soldChange!.severity).toBe("warning");
  });

  it("ignores monthly_sold drop <30%", () => {
    const prev = makeSnapshot({ monthly_sold: 10000 });
    const curr = makeSnapshot({ monthly_sold: 8000 }); // 20% drop
    const changes = detectChanges(prev, curr);
    const soldChange = changes.find((c) => c.field === "monthly_sold");
    expect(soldChange).toBeUndefined();
  });

  it("detects offer_count_new going to 0 as warning", () => {
    const prev = makeSnapshot({ offer_count_new: 5 });
    const curr = makeSnapshot({ offer_count_new: 0 });
    const changes = detectChanges(prev, curr);
    const offerChange = changes.find((c) => c.field === "offer_count_new");
    expect(offerChange).toBeDefined();
    expect(offerChange!.severity).toBe("warning");
  });

  it("detects offer_count_new change >50% as info", () => {
    const prev = makeSnapshot({ offer_count_new: 10 });
    const curr = makeSnapshot({ offer_count_new: 4 }); // 60% change
    const changes = detectChanges(prev, curr);
    const offerChange = changes.find((c) => c.field === "offer_count_new");
    expect(offerChange).toBeDefined();
    expect(offerChange!.severity).toBe("info");
  });

  it("detects out_of_stock_percentage_30 increase ≥10 points as warning", () => {
    const prev = makeSnapshot({ out_of_stock_percentage_30: 10 });
    const curr = makeSnapshot({ out_of_stock_percentage_30: 25 }); // +15 points
    const changes = detectChanges(prev, curr);
    const oosChange = changes.find((c) => c.field === "out_of_stock_percentage_30");
    expect(oosChange).toBeDefined();
    expect(oosChange!.severity).toBe("warning");
  });

  it("ignores out_of_stock_percentage_30 increase <10 points", () => {
    const prev = makeSnapshot({ out_of_stock_percentage_30: 10 });
    const curr = makeSnapshot({ out_of_stock_percentage_30: 15 }); // +5 points
    const changes = detectChanges(prev, curr);
    const oosChange = changes.find((c) => c.field === "out_of_stock_percentage_30");
    expect(oosChange).toBeUndefined();
  });

  it("detects is_sns change as info", () => {
    const prev = makeSnapshot({ is_sns: true });
    const curr = makeSnapshot({ is_sns: false });
    const changes = detectChanges(prev, curr);
    const snsChange = changes.find((c) => c.field === "is_sns");
    expect(snsChange).toBeDefined();
    expect(snsChange!.severity).toBe("info");
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
