import { ADAPTER_VERSION, SOURCE, CSV_TYPE, KEEPA_DOMAINS } from "../constants.js";
import type { UniversalEnvelope, ProductSnapshot } from "../schema/universal.js";
import type { TokenMeta } from "./client.js";
import type { KeepaProduct } from "../schema/keepa.js";
import { getLatestCsvValue } from "./keepa-csv.js";

// --- Envelope builders ---

export function toUniversalEnvelope(
  dataType: string,
  data: unknown,
  opts?: {
    marketplace?: string | null;
    tokens?: TokenMeta;
  }
): UniversalEnvelope {
  return {
    source: SOURCE,
    adapter_version: ADAPTER_VERSION,
    data_type: dataType,
    marketplace: opts?.marketplace ?? null,
    retrieved_at: new Date().toISOString(),
    tokens: opts?.tokens,
    data,
  };
}

export function toErrorEnvelope(
  code: string,
  message: string,
  httpStatus?: number
): UniversalEnvelope {
  return {
    source: SOURCE,
    adapter_version: ADAPTER_VERSION,
    data_type: "error",
    retrieved_at: new Date().toISOString(),
    data: null,
    error: {
      code,
      message,
      http_status: httpStatus,
    },
  };
}

// --- Domain helpers ---

function domainName(domainId: number): string {
  for (const [name, id] of Object.entries(KEEPA_DOMAINS)) {
    if (id === domainId) return name;
  }
  return "com";
}

// --- Per-type transformers ---

export function transformProductSnapshot(
  raw: KeepaProduct,
  domain?: string
): ProductSnapshot {
  const csv = raw.csv ?? [];
  const domainStr = domain ?? domainName(raw.domainId);

  // Parse images from imagesCSV (comma-separated filenames)
  const images: string[] = raw.imagesCSV
    ? raw.imagesCSV.split(",").filter(Boolean)
    : [];

  // Parse variation attributes from the `variations` array (structured data)
  // variationCSV is just a list of variation ASINs, not key-value pairs
  let variationAttributes: Record<string, string> | null = null;
  const childAsins: string[] = [];
  if (raw.variations?.length) {
    const self = raw.variations.find((v) => v.asin === raw.asin);
    if (self?.attributes?.length) {
      variationAttributes = {};
      for (const attr of self.attributes) {
        variationAttributes[attr.dimension] = attr.value;
      }
    }
    for (const v of raw.variations) {
      if (v.asin !== raw.asin) {
        childAsins.push(v.asin);
      }
    }
  } else if (raw.variationCSV) {
    // Fallback: variationCSV is a comma-separated list of variation ASINs
    const parts = raw.variationCSV.split(",").filter(Boolean);
    for (const asin of parts) {
      if (asin !== raw.asin) childAsins.push(asin);
    }
  }

  // Buy box info
  const buyBoxHistory = raw.buyBoxSellerIdHistory ?? raw.stats?.buyBoxSellerIdHistory;
  const buyBoxSellerId = buyBoxHistory?.length
    ? buyBoxHistory[buyBoxHistory.length - 1] ?? null
    : null;

  return {
    asin: raw.asin,
    domain: domainStr,
    title: raw.title ?? null,
    brand: raw.brand ?? null,
    amazon_price: getLatestCsvValue(csv[CSV_TYPE.AMAZON], { isPriceCents: true }),
    new_price: getLatestCsvValue(csv[CSV_TYPE.NEW], { isPriceCents: true }),
    sales_rank: getLatestCsvValue(csv[CSV_TYPE.SALES_RANK]),
    rating: (() => {
      const raw_rating = getLatestCsvValue(csv[CSV_TYPE.RATING]);
      return raw_rating != null ? raw_rating / 10 : null;
    })(),
    review_count: getLatestCsvValue(csv[CSV_TYPE.COUNT_REVIEWS]),
    buy_box_seller_id: buyBoxSellerId,
    buy_box_is_amazon: buyBoxSellerId === "ATVPDKIKX0DER" ? true : buyBoxSellerId ? false : null,
    buy_box_price: getLatestCsvValue(csv[CSV_TYPE.BUY_BOX_SHIPPING], { isPriceCents: true }),
    images,
    features: raw.features ?? [],
    description: raw.description ?? null,
    parent_asin: raw.parentAsin ?? null,
    child_asins: childAsins,
    variation_attributes: variationAttributes,
  };
}

export function transformBuyBox(raw: KeepaProduct) {
  const buyBoxHistory = raw.buyBoxSellerIdHistory ?? raw.stats?.buyBoxSellerIdHistory ?? [];
  const csv = raw.csv ?? [];

  return {
    asin: raw.asin,
    current_seller_id: buyBoxHistory.length
      ? buyBoxHistory[buyBoxHistory.length - 1] ?? null
      : null,
    is_amazon:
      buyBoxHistory.length && buyBoxHistory[buyBoxHistory.length - 1] === "ATVPDKIKX0DER"
        ? true
        : false,
    buy_box_price: getLatestCsvValue(csv[CSV_TYPE.BUY_BOX_SHIPPING], { isPriceCents: true }),
    offers: (raw.offers ?? []).map((o) => ({
      seller_id: o.sellerId ?? null,
      seller_name: o.sellerName ?? null,
      is_fba: o.isFBA ?? null,
      is_prime: o.isPrime ?? null,
      is_buy_box_winner: o.isBuyBoxWinner ?? null,
      condition: o.condition ?? null,
    })),
  };
}

export function transformVariationFamily(raw: KeepaProduct) {
  let attributes: Record<string, string> | null = null;
  const variationAsins: string[] = [];

  if (raw.variations?.length) {
    for (const v of raw.variations) {
      variationAsins.push(v.asin);
      if (v.asin === raw.asin && v.attributes?.length) {
        attributes = {};
        for (const attr of v.attributes) {
          attributes[attr.dimension] = attr.value;
        }
      }
    }
  } else if (raw.variationCSV) {
    variationAsins.push(...raw.variationCSV.split(",").filter(Boolean));
  }

  return {
    asin: raw.asin,
    parent_asin: raw.parentAsin ?? null,
    variation_attributes: attributes,
    variation_asins: variationAsins,
  };
}
