import { describe, it, expect } from "vitest";
import {
  transformProductSnapshot,
  transformBuyBox,
  transformVariationFamily,
  transformSalesHistory,
  transformDeals,
  transformSellerStats,
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
    monthlySold: 10000,
    monthlySoldHistory: [0, 5000, 60, 10000],
    isSNS: true,
    frequentlyBoughtTogether: null,
    couponHistory: [0, 0, -10, 60, 0, 0],
    promotions: [{ type: "SNS", sellerId: "A2EJCTH67GJMT3", amount: 1800, discountPercent: 10, snsBulkDiscountPercent: null }],
    stats: {
      current: [1999, 2499, null, 5000, 2000, null, null, null, null, null, null, 3, null, null, null, null, 45, 100, 1999],
      offerCountFBA: 2,
      offerCountFBM: 1,
      outOfStockPercentage30: [43, 0, 100, -1],
      outOfStockPercentage90: [63, 0, 100, -1],
      buyBoxStats: {
        A2EJCTH67GJMT3: {
          percentageWon: 99.78,
          avgPrice: 2000,
          avgNewOfferCount: 3,
          avgUsedOfferCount: -1,
          isFBA: true,
          lastSeen: 8002384,
        },
      },
    },
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
      expect(snapshot.images).toEqual([
        "https://m.media-amazon.com/images/I/img1.jpg",
        "https://m.media-amazon.com/images/I/img2.jpg",
      ]);
      expect(snapshot.features).toEqual(["Feature 1", "Feature 2"]);
      expect(snapshot.variation_attributes).toEqual({ Color: "Blue", Size: "Large" });
      expect(snapshot.child_asins).toEqual(["B00B8YTP12"]);
    });

    it("handles null csv arrays", () => {
      const raw = makeRawProduct({ csv: null, stats: undefined });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.amazon_price).toBeNull();
      expect(snapshot.sales_rank).toBeNull();
    });

    it("reads images from the structured images array (new Keepa format)", () => {
      const raw = makeRawProduct({
        imagesCSV: null,
        images: [
          { l: "61iyWLSkcJL.jpg", lH: 2540, lW: 2540, m: "31zHQ8Sxh6L.jpg", mH: 500, mW: 500 },
          { l: "71EEZOl2bOL.jpg", lH: 2540, lW: 2540, m: "41Ab.jpg", mH: 500, mW: 500 },
        ],
      });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.images).toEqual([
        "https://m.media-amazon.com/images/I/61iyWLSkcJL.jpg",
        "https://m.media-amazon.com/images/I/71EEZOl2bOL.jpg",
      ]);
    });

    it("prefers structured images array over legacy imagesCSV when both are present", () => {
      const raw = makeRawProduct({
        imagesCSV: "legacy1.jpg,legacy2.jpg",
        images: [{ l: "new.jpg", lH: 1, lW: 1, m: "newm.jpg", mH: 1, mW: 1 }],
      });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.images).toEqual(["https://m.media-amazon.com/images/I/new.jpg"]);
    });

    it("falls back to stats.current when csv arrays are null", () => {
      const raw = makeRawProduct({
        csv: null,
        stats: {
          current: [
            2000, // AMAZON (0) = $20.00
            3599, // NEW (1) = $35.99
            null, // USED (2)
            1220, // SALES_RANK (3)
            null, null, null, null, null, null, null, null, null, null, null, null,
            48,   // RATING (16) = 4.8
            10625, // COUNT_REVIEWS (17)
            2000, // BUY_BOX_SHIPPING (18) = $20.00
          ],
        },
      });
      const snapshot = transformProductSnapshot(raw);
      expect(snapshot.amazon_price).toBe(20.00);
      expect(snapshot.new_price).toBe(35.99);
      expect(snapshot.sales_rank).toBe(1220);
      expect(snapshot.rating).toBe(4.8);
      expect(snapshot.review_count).toBe(10625);
      expect(snapshot.buy_box_price).toBe(20.00);
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
      // lastSeen must be recent (Keepa time = minutes since 2011-01-01)
      const recentKeepaTime = Math.floor((Date.now() - 1293840000000) / 60000);
      const raw = makeRawProduct({
        offers: [
          {
            sellerId: "ATVPDKIKX0DER",
            sellerName: "Amazon.com",
            isFBA: true,
            isPrime: true,
            isBuyBoxWinner: true,
            condition: 1,
            lastSeen: recentKeepaTime,
          },
          {
            sellerId: "OLD_SELLER",
            sellerName: "Gone Inc",
            isFBA: false,
            isPrime: false,
            condition: 1,
            lastSeen: recentKeepaTime - 60 * 24 * 30, // 30 days ago
          },
        ],
      });
      const bb = transformBuyBox(raw);
      expect(bb.current_seller_id).toBe("ATVPDKIKX0DER");
      expect(bb.is_amazon).toBe(true);
      expect(bb.total_offers_tracked).toBe(2);
      expect(bb.offers).toHaveLength(1); // only the recent one
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

  describe("new snapshot fields", () => {
    it("extracts monthly_sold, is_sns, and offer counts", () => {
      const raw = makeRawProduct();
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.monthly_sold).toBe(10000);
      expect(snapshot.is_sns).toBe(true);
      expect(snapshot.offer_count_fba).toBe(2);
      expect(snapshot.offer_count_fbm).toBe(1);
    });

    it("extracts out of stock percentages from stats", () => {
      const raw = makeRawProduct();
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.out_of_stock_percentage_30).toBe(43);
      expect(snapshot.out_of_stock_percentage_90).toBe(63);
    });

    it("treats -1 out_of_stock as null", () => {
      const raw = makeRawProduct({
        stats: {
          current: [],
          outOfStockPercentage30: [-1, 0],
          outOfStockPercentage90: [-1, 0],
        },
      });
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.out_of_stock_percentage_30).toBeNull();
      expect(snapshot.out_of_stock_percentage_90).toBeNull();
    });

    it("extracts list_price from CSV index 4", () => {
      const csv: (number[] | null)[] = [
        [0, 1999], // AMAZON
        [0, 2499], // NEW
        null,       // USED
        [0, 5000],  // SALES_RANK
        [0, 2500],  // LIST_PRICE (index 4) = $25.00
      ];
      const raw = makeRawProduct({ csv });
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.list_price).toBe(25.00);
    });

    it("extracts offer_count_new from CSV index 11", () => {
      const csv: (number[] | null)[] = new Array(12).fill(null);
      csv[11] = [0, 5]; // COUNT_NEW
      const raw = makeRawProduct({ csv });
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.offer_count_new).toBe(5);
    });

    it("returns empty array for null frequentlyBoughtTogether", () => {
      const raw = makeRawProduct({ frequentlyBoughtTogether: null });
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.frequently_bought_together).toEqual([]);
    });

    it("passes through frequentlyBoughtTogether ASINs", () => {
      const raw = makeRawProduct({
        frequentlyBoughtTogether: ["B001", "B002"],
      });
      const snapshot = transformProductSnapshot(raw, "com");
      expect(snapshot.frequently_bought_together).toEqual(["B001", "B002"]);
    });
  });

  describe("transformSalesHistory", () => {
    it("returns current monthly sold and history", () => {
      const raw = makeRawProduct();
      const result = transformSalesHistory(raw);
      expect(result.asin).toBe("B0012ZQPKG");
      expect(result.current_monthly_sold).toBe(10000);
      expect(result.history).toHaveLength(2);
      expect(result.history[0].value).toBe(5000);
      expect(result.history[1].value).toBe(10000);
    });
  });

  describe("transformDeals", () => {
    it("decodes coupon history triplets and promotions", () => {
      const raw = makeRawProduct();
      const result = transformDeals(raw);
      expect(result.asin).toBe("B0012ZQPKG");
      expect(result.coupon_history).toHaveLength(2);
      // First triplet: [0, 0, -10] -> 10% off
      expect(result.coupon_history[0].percent_discount).toBe(10);
      expect(result.coupon_history[0].absolute_discount).toBeNull();
      // Second triplet: [60, 0, 0] -> coupon removed
      expect(result.coupon_history[1].percent_discount).toBeNull();
      expect(result.coupon_history[1].absolute_discount).toBeNull();
      // Promotions
      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe("SNS");
      expect(result.promotions[0].amount).toBe(18.00);
      expect(result.promotions[0].discount_percent).toBe(10);
    });
  });

  describe("transformSellerStats", () => {
    it("transforms buy box stats per seller", () => {
      const raw = makeRawProduct();
      const result = transformSellerStats(raw);
      expect(result.sellers).toHaveLength(1);
      expect(result.sellers[0].seller_id).toBe("A2EJCTH67GJMT3");
      expect(result.sellers[0].percentage_won).toBe(99.78);
      expect(result.sellers[0].avg_price).toBe(20.00);
      expect(result.sellers[0].is_fba).toBe(true);
      expect(result.sellers[0].avg_used_offer_count).toBeNull(); // -1 -> null
      expect(result.sellers[0].last_seen).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("returns empty sellers when no buyBoxStats", () => {
      const raw = makeRawProduct({ stats: undefined });
      const result = transformSellerStats(raw);
      expect(result.sellers).toEqual([]);
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
