import { describe, it, expect } from "vitest";
import { KeepaTokenBucket } from "../../src/utils/rate-limit.js";

describe("KeepaTokenBucket", () => {
  it("starts with configured number of tokens", () => {
    const bucket = new KeepaTokenBucket(10);
    expect(bucket.balance).toBeCloseTo(10, 0);
  });

  it("acquires tokens immediately when available", async () => {
    const bucket = new KeepaTokenBucket(10);
    const start = Date.now();
    await bucket.acquire(1);
    expect(Date.now() - start).toBeLessThan(50);
    expect(bucket.balance).toBeCloseTo(9, 0);
  });

  it("acquires variable cost", async () => {
    const bucket = new KeepaTokenBucket(10);
    await bucket.acquire(5);
    expect(bucket.balance).toBeCloseTo(5, 0);
  });

  it("allows a Keepa request to drive a positive bucket negative", async () => {
    const bucket = new KeepaTokenBucket(5);
    await bucket.acquire(50);
    expect(bucket.balance).toBeLessThan(0);
  });

  it("does not wait for zero-cost requests when the bucket is negative", async () => {
    const bucket = new KeepaTokenBucket(5);
    await bucket.acquire(50);
    const start = Date.now();
    await bucket.acquire(0);
    expect(Date.now() - start).toBeLessThan(20);
  });

  it("updates from API response", () => {
    const bucket = new KeepaTokenBucket(5);
    bucket.updateFromResponse({
      tokensLeft: 42,
      refillIn: 30000,
      refillRate: 20,
    });
    expect(bucket.balance).toBeCloseTo(42, 0);
  });

  it("waits when tokens are exhausted then proceeds", async () => {
    // Use a high rate (6000/min = 100/s) so wait is ~10ms
    const bucket = new KeepaTokenBucket(6000);
    // Drain all tokens
    await bucket.acquire(6000);
    const start = Date.now();
    await bucket.acquire(1);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(500);
  });
});
