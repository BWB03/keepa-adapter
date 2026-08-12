import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepaClient } from "../../src/adapter/client.js";
import {
  addApiTrackings,
  browseDeals,
  findProducts,
  findSellers,
  getApiTrackings,
  getBestSellers,
  getCategoryLookup,
  getGraphImage,
  getLightningDeals,
  getProduct,
  getSellers,
  getTopSellers,
  getTrackingListNames,
  getTrackingNotifications,
  removeApiTracking,
  searchCategories,
  searchProducts,
  setTrackingWebhook,
} from "../../src/adapter/endpoints.js";
import { KeepaTokenBucket } from "../../src/utils/rate-limit.js";

const metadata = {
  timestamp: 1,
  tokensLeft: 1000,
  refillIn: 1000,
  refillRate: 1000,
  products: [],
  categories: {},
  sellers: {},
  asinList: [],
  sellerIdList: [],
  deals: [],
  lightningDeals: [],
  trackings: [],
  notifications: [],
  trackingListNames: [],
};

function createClient() {
  return new KeepaClient({
    apiKey: "test-key",
    baseUrl: "https://api.keepa.test",
    bucket: new KeepaTokenBucket(10_000),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("Keepa endpoint coverage", () => {
  it("sends days separately from the stats interval", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify(metadata), {
        headers: { "content-type": "application/json" },
      });
    }));

    await getProduct(createClient(), {
      asins: ["B001TEST00"],
      stats: 30,
      days: 90,
      history: true,
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("stats")).toBe("30");
    expect(url.searchParams.get("days")).toBe("90");
  });

  it("covers every unique path in the current Keepa endpoint index", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (new URL(url).pathname === "/graphimage") {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png" },
        });
      }
      return new Response(JSON.stringify(metadata), {
        headers: { "content-type": "application/json" },
      });
    }));

    const client = createClient();
    await getProduct(client, { asins: ["B001TEST00"] });
    await searchProducts(client, { term: "water bottle" });
    await findProducts(client, { selection: { title: "bottle" } });
    await browseDeals(client, { selection: { page: 0 } });
    await getBestSellers(client, { category: 123 });
    await getCategoryLookup(client, { category: [0, 123], parents: true });
    await searchCategories(client, { term: "bottle" });
    await getSellers(client, { sellerIds: ["SELLER1"] });
    await findSellers(client, { selection: { sellerName: ["example"] } });
    await getTopSellers(client, {});
    await getLightningDeals(client, { asin: "B001TEST00" });
    await getGraphImage(client, { asin: "B001TEST00" });
    await addApiTrackings(client, [{ asin: "B001TEST00" }]);

    const paths = new Set(requests.map(({ url }) => new URL(url).pathname));
    expect(paths).toEqual(new Set([
      "/product",
      "/search",
      "/query",
      "/deal",
      "/bestsellers",
      "/category",
      "/seller",
      "/sellerquery",
      "/topseller",
      "/lightningdeal",
      "/graphimage",
      "/tracking",
    ]));

    const postPaths = requests
      .filter(({ init }) => init?.method === "POST")
      .map(({ url }) => new URL(url).pathname);
    expect(postPaths).toEqual(expect.arrayContaining(["/query", "/deal", "/sellerquery", "/tracking"]));
  });

  it("supports every documented tracking operation", async () => {
    const types: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      types.push(new URL(String(input)).searchParams.get("type") ?? "");
      return new Response(JSON.stringify(metadata), {
        headers: { "content-type": "application/json" },
      });
    }));

    const client = createClient();
    await addApiTrackings(client, [{ asin: "B001TEST00" }]);
    await removeApiTracking(client, { asin: "B001TEST00" });
    await removeApiTracking(client, { removeAll: true });
    await getApiTrackings(client, { asin: "B001TEST00" });
    await getApiTrackings(client, {});
    await getTrackingNotifications(client, { since: 1, revise: false, readOnly: true });
    await getTrackingListNames(client);
    await setTrackingWebhook(client, "https://example.com/keepa");

    expect(types).toEqual([
      "add",
      "remove",
      "removeAll",
      "get",
      "list",
      "notification",
      "listNames",
      "webhook",
    ]);
  });

  it("rejects unknown and endpoint-incompatible domains", async () => {
    await expect(getProduct(createClient(), { asins: ["B001TEST00"], domain: "au" }))
      .rejects.toThrow("Unsupported Keepa domain");
    await expect(getTopSellers(createClient(), { domain: "br" }))
      .rejects.toThrow("does not support");
  });
});
