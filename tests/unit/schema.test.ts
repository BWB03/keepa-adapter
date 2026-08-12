import { describe, it, expect } from "vitest";
import {
  KeepaProductResponseSchema,
  KeepaTokenStatusSchema,
  KeepaTrackingResponseSchema,
} from "../../src/schema/keepa.js";
import {
  UniversalEnvelopeSchema,
  ChangeEventSchema,
  BsrTrendSchema,
} from "../../src/schema/universal.js";

describe("schemas", () => {
  describe("KeepaProductResponseSchema", () => {
    it("parses a minimal product response", () => {
      const data = {
        timestamp: 1234567890,
        tokensLeft: 5,
        refillIn: 30000,
        refillRate: 5,
        products: [
          {
            asin: "B0012ZQPKG",
            domainId: 1,
            title: "Test",
          },
        ],
      };
      const result = KeepaProductResponseSchema.parse(data);
      expect(result.products).toHaveLength(1);
      expect(result.products![0].asin).toBe("B0012ZQPKG");
    });

    it("allows null products", () => {
      const data = {
        timestamp: 1234567890,
        tokensLeft: 5,
        refillIn: 30000,
        refillRate: 5,
        products: null,
      };
      const result = KeepaProductResponseSchema.parse(data);
      expect(result.products).toBeNull();
    });
  });

  describe("KeepaTokenStatusSchema", () => {
    it("parses token status", () => {
      const data = {
        timestamp: 1234567890,
        tokensLeft: 42,
        refillIn: 15000,
        refillRate: 10,
      };
      const result = KeepaTokenStatusSchema.parse(data);
      expect(result.tokensLeft).toBe(42);
    });
  });

  describe("expanded Keepa API schemas", () => {
    it("preserves endpoint-specific tracking fields", () => {
      const result = KeepaTrackingResponseSchema.parse({
        timestamp: 1,
        tokensLeft: 42,
        refillIn: 15000,
        refillRate: 10,
        trackingListNames: ["priority"],
        futureKeepaField: true,
      });
      expect(result.trackingListNames).toEqual(["priority"]);
      expect(result.futureKeepaField).toBe(true);
    });
  });

  describe("UniversalEnvelopeSchema", () => {
    it("parses a valid envelope", () => {
      const data = {
        source: "keepa",
        adapter_version: "1.1.1",
        data_type: "product_snapshot",
        marketplace: "com",
        retrieved_at: new Date().toISOString(),
        data: [{ asin: "B001" }],
      };
      const result = UniversalEnvelopeSchema.parse(data);
      expect(result.source).toBe("keepa");
    });
  });

  describe("ChangeEventSchema", () => {
    it("parses a change event", () => {
      const data = {
        asin: "B001",
        domain: "com",
        field: "title",
        old_value: "Old",
        new_value: "New",
        severity: "critical" as const,
        detected_at: new Date().toISOString(),
      };
      expect(ChangeEventSchema.parse(data).severity).toBe("critical");
    });
  });

  describe("BsrTrendSchema", () => {
    it("parses a BSR trend", () => {
      const data = {
        asin: "B001",
        period_days: 10,
        start_rank: 5000,
        end_rank: 8000,
        percent_change: 60,
        trend: "critical_decline" as const,
      };
      expect(BsrTrendSchema.parse(data).trend).toBe("critical_decline");
    });
  });
});
