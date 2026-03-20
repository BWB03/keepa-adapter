import { describe, it, expect } from "vitest";
import {
  transformProductSnapshot,
  transformBuyBox,
  transformVariationFamily,
  toUniversalEnvelope,
  toErrorEnvelope,
} from "../../src/adapter/transformer.js";
import type { KeepaProduct } from "../../src/schema/keepa.js";

function makeRawProduct(overrides: Partial<KeepaProduct> = {}): KeepaProduct {
  return {
    asin: "B0012ZQPKG",
    domainId: 1,
    title: "Test Product",
    brand: "TestBrand",
    parentAsin: "B0012PARENT",
    variationCSV: "B0012ZQPKG,B00B8YTP12",
    variations: [
      { asin: "B0012ZQPKG", attributes: [{ dimension: "Color", value: "Blue" }, { dimension: "Size", value: "Large" }] },
      { asin: "B00B8YTP12", attributes: [{ dimension: "Color", value: "Red" }, { dimension: "Size", value: "Small" }] },
    ],
    csv: [
      // AMAZON (0): last value = 1999 cents
      [0, 1999],
      // NEW (1): last value = 2499 cents
      [0, 2499],
      // USED (2)
      null,
      // SALES_RANK (3): last value = 5000
      [0, 5000],
    ],
    imagesCSV: "img1.jpg,img2.jpg",
    features: ["Feature 1", "Feature 2"],
    description: "A test product description",
    buyBoxSellerIdHistory: ["ATVPDKIKX0DER"],
    ...overrides,
  } as KeepaProduct;
}

describe("transformer", () => {
  describe("transformProductSnapshot", () => {
    it("transforms a raw Keepa product to ProductSnapshot", () => {
      const raw = makeRawProduct();
      const snapshot = transformProductSnapshot(raw, "com");

      expect(snapshot.asin).toBe("B0012ZQPKG");
      expect(snapshot.domain).toBe("com");
      expect(snapshot.title).toBe("Test Product");
      expect(snapshot.brand).toBe("TestBrand");
      expect(snapshot.amazon_price).toBe(19.99);
      expect(snapshot.new_price).toBe(24.99);
      expect(snapshot.sales_rank).toBe(5000);
      expect(snapshot.parent_asin).toBe("B0012PARENT");
      expect(snapshot.images).toEqual(["img1.jpg", "img2.jpg"]);
      expect(snapshot.features).toEqual(["Feature 1", "Feature 2"]);
      expect(snapshot.variation_attributes).toEqual({ Color: "Blue", Size: "Large" });
      expect(snapshot.child_asins).toEqual(["B00B8YTP12"]);
    });

    it("handles null csv arrays", () => {
      const raw = makeRawProduct({ csv: null });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.amazon_price).toBeNull();
      expect(snapshot.sales_rank).toBeNull();
    });

    it("detects Amazon as buy box winner", () => {
      const raw = makeRawProduct({
        buyBoxSellerIdHistory: ["ATVPDKIKX0DER"],
      });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.buy_box_is_amazon).toBe(true);
    });

    it("detects third party buy box winner", () => {
      const raw = makeRawProduct({
        buyBoxSellerIdHistory: ["A3OTHER123"],
      });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.buy_box_is_amazon).toBe(false);
      expect(snapshot.buy_box_seller_id).toBe("A3OTHER123");
    });
  });

  describe("transformBuyBox", () => {
    it("extracts buy box info", () => {
      const raw = makeRawProduct({
        offers: [
          {
            sellerId: "ATVPDKIKX0DER",
            sellerName: "Amazon.com",
            isFBA: true,
            isPrime: true,
            isBuyBoxWinner: true,
            condition: 1,
          },
        ],
      });
      const bb = transformBuyBox(raw);
      expect(bb.current_seller_id).toBe("ATVPDKIKX0DER");
      expect(bb.is_amazon).toBe(true);
      expect(bb.offers).toHaveLength(1);
      expect(bb.offers[0].seller_name).toBe("Amazon.com");
    });
  });

  describe("transformVariationFamily", () => {
    it("parses variations array", () => {
      const raw = makeRawProduct();
      const result = transformVariationFamily(raw);
      expect(result.parent_asin).toBe("B0012PARENT");
      expect(result.variation_attributes).toEqual({
        Color: "Blue",
        Size: "Large",
      });
      expect(result.variation_asins).toEqual(["B0012ZQPKG", "B00B8YTP12"]);
    });

    it("falls back to variationCSV when no variations array", () => {
      const raw = makeRawProduct({ variations: undefined });
      const result = transformVariationFamily(raw);
      expect(result.variation_attributes).toBeNull();
      expect(result.variation_asins).toEqual(["B0012ZQPKG", "B00B8YTP12"]);
    });

    it("handles no variation data at all", () => {
      const raw = makeRawProduct({ variationCSV: null, variations: undefined });
      const result = transformVariationFamily(raw);
      expect(result.variation_attributes).toBeNull();
      expect(result.variation_asins).toEqual([]);
    });
  });

  describe("envelope builders", () => {
    it("builds universal envelope", () => {
      const env = toUniversalEnvelope("test", { foo: "bar" }, {
        marketplace: "com",
        tokens: { remaining: 5, refill_in_ms: 30000, refill_rate: 10 },
      });
      expect(env.source).toBe("keepa");
      expect(env.data_type).toBe("test");
      expect(env.marketplace).toBe("com");
      expect(env.tokens?.remaining).toBe(5);
      expect(env.data).toEqual({ foo: "bar" });
    });

    it("builds error envelope", () => {
      const env = toErrorEnvelope("test_error", "Something broke", 500);
      expect(env.data_type).toBe("error");
      expect(env.error?.code).toBe("test_error");
      expect(env.error?.http_status).toBe(500);
    });
  });
});
