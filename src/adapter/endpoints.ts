import { KeepaClient } from "./client.js";
import {
  KeepaProductResponseSchema,
  KeepaTokenStatusSchema,
  KeepaBestSellersResponseSchema,
  KeepaCategoryResponseSchema,
  KeepaProductSearchResponseSchema,
  KeepaProductFinderResponseSchema,
  KeepaDealsResponseSchema,
  KeepaSellerResponseSchema,
  KeepaSellerFinderResponseSchema,
  KeepaTopSellerResponseSchema,
  KeepaLightningDealsResponseSchema,
  KeepaTrackingResponseSchema,
} from "../schema/keepa.js";
import { KEEPA_DOMAINS, DEFAULT_DOMAIN } from "../constants.js";

export function domainCode(domain?: string, allowBrazil = true): number {
  const name = domain ?? DEFAULT_DOMAIN;
  const code = KEEPA_DOMAINS[name];
  if (code == null) {
    throw new Error(`Unsupported Keepa domain: ${name}`);
  }
  if (!allowBrazil && code === 12) {
    throw new Error(`Keepa does not support the ${name} locale for this endpoint`);
  }
  return code;
}

export async function getProduct(
  client: KeepaClient,
  opts: {
    asins: string[];
    domain?: string;
    stats?: number;
    history?: boolean;
    offers?: number;
    rating?: boolean;
    buybox?: boolean;
    days?: number;
    update?: number;
    onlyLiveOffers?: boolean;
    videos?: boolean;
    aplus?: boolean;
    stock?: boolean;
    historicalVariations?: boolean;
  }
) {
  const params: Record<string, string | number | boolean | undefined> = {
    domain: domainCode(opts.domain),
    asin: opts.asins.join(","),
  };
  if (opts.stats != null) params.stats = opts.stats;
  if (opts.history === false) params.history = 0;
  if (opts.offers != null) params.offers = opts.offers;
  if (opts.rating) params.rating = 1;
  if (opts.buybox) params.buybox = 1;
  if (opts.days != null) params.days = opts.days;
  if (opts.update != null) params.update = opts.update;
  if (opts.onlyLiveOffers) params["only-live-offers"] = 1;
  if (opts.videos) params.videos = 1;
  if (opts.aplus) params.aplus = 1;
  if (opts.stock) params.stock = 1;
  if (opts.historicalVariations) params["historical-variations"] = 1;

  const count = opts.asins.length;
  const tokenCost = opts.offers != null
    ? Math.max(5, Math.ceil(opts.offers / 10) * 6) * count + (opts.stock ? 2 * count : 0)
    : count * (1 + (opts.buybox ? 2 : 0) + (opts.rating ? 1 : 0) + (opts.historicalVariations ? 1 : 0));

  return client.get("/product", KeepaProductResponseSchema, params, tokenCost);
}

export async function getTokenStatus(client: KeepaClient) {
  return client.get("/token", KeepaTokenStatusSchema, undefined, 0);
}

export async function getBestSellers(
  client: KeepaClient,
  opts: { domain?: string; category: number | string; range?: number; sublist?: boolean }
) {
  return client.get("/bestsellers", KeepaBestSellersResponseSchema, {
    domain: domainCode(opts.domain, false),
    category: opts.category,
    range: opts.range,
    sublist: opts.sublist ? 1 : undefined,
  }, 50);
}

export async function getCategoryLookup(
  client: KeepaClient,
  opts: { domain?: string; category: number | number[]; parents?: boolean }
) {
  return client.get("/category", KeepaCategoryResponseSchema, {
    domain: domainCode(opts.domain, false),
    category: Array.isArray(opts.category) ? opts.category.join(",") : opts.category,
    parents: opts.parents ? 1 : 0,
  });
}

export async function searchProducts(
  client: KeepaClient,
  opts: {
    domain?: string;
    term: string;
    page?: number;
    stats?: number;
    asinsOnly?: boolean;
  }
) {
  return client.get("/search", KeepaProductSearchResponseSchema, {
    domain: domainCode(opts.domain, false),
    type: "product",
    term: opts.term,
    page: opts.page,
    stats: opts.stats,
    "asins-only": opts.asinsOnly ? 1 : undefined,
  }, 10);
}

export async function findProducts(
  client: KeepaClient,
  opts: { domain?: string; selection: Record<string, unknown>; stats?: boolean }
) {
  return client.post("/query", KeepaProductFinderResponseSchema, opts.selection, {
    domain: domainCode(opts.domain),
    stats: opts.stats ? 1 : undefined,
  }, 10);
}

export async function browseDeals(
  client: KeepaClient,
  opts: { domain?: string; selection: Record<string, unknown> }
) {
  const selection = {
    domainId: domainCode(opts.domain, false),
    ...opts.selection,
  };
  return client.post("/deal", KeepaDealsResponseSchema, selection, undefined, 5);
}

export async function searchCategories(
  client: KeepaClient,
  opts: { domain?: string; term: string }
) {
  return client.get("/search", KeepaCategoryResponseSchema, {
    domain: domainCode(opts.domain, false),
    type: "category",
    term: opts.term,
  });
}

export async function getSellers(
  client: KeepaClient,
  opts: { domain?: string; sellerIds: string[]; storefront?: boolean }
) {
  const perSellerCost = opts.storefront ? 10 : 1;
  return client.get("/seller", KeepaSellerResponseSchema, {
    domain: domainCode(opts.domain, false),
    seller: opts.sellerIds.join(","),
    storefront: opts.storefront ? 1 : undefined,
  }, perSellerCost * opts.sellerIds.length);
}

export async function findSellers(
  client: KeepaClient,
  opts: { domain?: string; selection: Record<string, unknown> }
) {
  return client.post("/sellerquery", KeepaSellerFinderResponseSchema, opts.selection, {
    domain: domainCode(opts.domain, false),
  }, 10);
}

export async function getTopSellers(
  client: KeepaClient,
  opts: { domain?: string }
) {
  return client.get("/topseller", KeepaTopSellerResponseSchema, {
    domain: domainCode(opts.domain, false),
  }, 50);
}

export async function getLightningDeals(
  client: KeepaClient,
  opts: { domain?: string; asin?: string; state?: string }
) {
  return client.get("/lightningdeal", KeepaLightningDealsResponseSchema, {
    domain: domainCode(opts.domain, false),
    asin: opts.asin,
    state: opts.state,
  }, opts.asin ? 1 : 500);
}

export async function getGraphImage(
  client: KeepaClient,
  opts: {
    domain?: string;
    asin: string;
    days?: number;
    width?: number;
    height?: number;
    range?: number;
    types?: string;
    subranks?: boolean;
    monthlysold?: boolean;
  }
) {
  return client.getBinary("/graphimage", {
    domain: domainCode(opts.domain, false),
    asin: opts.asin,
    days: opts.days,
    width: opts.width,
    height: opts.height,
    range: opts.range,
    types: opts.types,
    subranks: opts.subranks ? 1 : undefined,
    monthlysold: opts.monthlysold ? 1 : undefined,
  });
}

export async function addApiTrackings(
  client: KeepaClient,
  trackings: Record<string, unknown>[],
  list?: string
) {
  return client.post("/tracking", KeepaTrackingResponseSchema, trackings, {
    type: "add",
    list,
  }, trackings.length);
}

export async function removeApiTracking(
  client: KeepaClient,
  opts: { asin?: string; removeAll?: boolean; list?: string }
) {
  if (!opts.removeAll && !opts.asin) {
    throw new Error("asin is required unless removeAll is true");
  }
  return client.get("/tracking", KeepaTrackingResponseSchema, {
    type: opts.removeAll ? "removeAll" : "remove",
    asin: opts.removeAll ? undefined : opts.asin,
    list: opts.list,
  }, 0);
}

export async function getApiTrackings(
  client: KeepaClient,
  opts: {
    asin?: string;
    list?: string;
    asinsOnly?: boolean;
    page?: number;
    perPage?: number;
  }
) {
  return client.get("/tracking", KeepaTrackingResponseSchema, {
    type: opts.asin ? "get" : "list",
    asin: opts.asin,
    list: opts.list,
    "asins-only": opts.asinsOnly ? 1 : undefined,
    page: opts.page,
    perPage: opts.perPage,
  }, 0);
}

export async function getTrackingNotifications(
  client: KeepaClient,
  opts: {
    since: number;
    revise: boolean;
    all?: boolean;
    readOnly?: boolean;
    list?: string;
  }
) {
  return client.get("/tracking", KeepaTrackingResponseSchema, {
    type: "notification",
    since: opts.since,
    revise: opts.revise ? 1 : 0,
    all: opts.all ? 1 : undefined,
    readOnly: opts.readOnly ? 1 : undefined,
    list: opts.list,
  }, 0);
}

export async function getTrackingListNames(client: KeepaClient) {
  return client.get("/tracking", KeepaTrackingResponseSchema, {
    type: "listNames",
  }, 0);
}

export async function setTrackingWebhook(client: KeepaClient, url: string) {
  return client.get("/tracking", KeepaTrackingResponseSchema, {
    type: "webhook",
    url,
  }, 0);
}
