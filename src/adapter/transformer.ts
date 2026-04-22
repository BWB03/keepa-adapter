import { ADAPTER_VERSION, SOURCE, CSV_TYPE, KEEPA_DOMAINS } from "../constants.js";
import type { UniversalEnvelope, ProductSnapshot, SubcategoryRank } from "../schema/universal.js";
import type { TokenMeta } from "./client.js";
import type { KeepaProduct } from "../schema/keepa.js";
import { getLatestCsvValue, decodeCsvTimeSeries, decodeCouponTimeSeries } from "./keepa-csv.js";
import { dateToKeepaTime, keepaTimeToISO } from "./keepa-time.js";

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

/** Get latest value from CSV array, falling back to stats.current[index] */
function getValueWithFallback(
  csv: (number[] | null)[] | null,
  statsCurrent: (number | null)[] | null | undefined,
  index: number,
  opts?: { isPriceCents?: boolean }
): number | null {
  // Try CSV time-series first
  const csvVal = getLatestCsvValue(csv?.[index], opts);
  if (csvVal != null) return csvVal;

  // Fallback to stats.current
  const statsVal = statsCurrent?.[index];
  if (statsVal == null || statsVal === -1) return null;
  return opts?.isPriceCents ? statsVal / 100 : statsVal;
}

export function transformProductSnapshot(
  raw: KeepaProduct,
  domain?: string
): ProductSnapshot {
  const csv = raw.csv ?? [];
  const statsCurrent = raw.stats?.current;
  const domainStr = domain ?? domainName(raw.domainId);

  // Keepa returns imagesCSV as comma-separated Amazon image filenames; emit full URLs.
  const images: string[] = raw.imagesCSV
    ? raw.imagesCSV
        .split(",")
        .filter(Boolean)
        .map((f) => `https://m.media-amazon.com/images/I/${f}`)
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

  // Build category name lookup from categoryTree
  const catNameMap = new Map<number, string>();
  if (raw.categoryTree) {
    for (const cat of raw.categoryTree) {
      catNameMap.set(cat.catId, cat.name);
    }
  }

  // Extract subcategory ranks from salesRanks
  const subcategoryRanks: SubcategoryRank[] = [];
  if (raw.salesRanks) {
    const primaryCatId = raw.salesRankReference ?? null;
    for (const [catIdStr, history] of Object.entries(raw.salesRanks)) {
      const catId = Number(catIdStr);
      // history is a Keepa time-series: [time, rank, time, rank, ...]
      const lastValue = history.length >= 2 ? history[history.length - 1] : null;
      subcategoryRanks.push({
        category_id: catId,
        category_name: catNameMap.get(catId) ?? null,
        rank: lastValue === -1 ? null : lastValue,
        is_primary: catId === primaryCatId,
      });
    }
    // Sort: primary first, then by rank ascending
    subcategoryRanks.sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
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
    amazon_price: getValueWithFallback(csv, statsCurrent, CSV_TYPE.AMAZON, { isPriceCents: true }),
    new_price: getValueWithFallback(csv, statsCurrent, CSV_TYPE.NEW, { isPriceCents: true }),
    sales_rank: getValueWithFallback(csv, statsCurrent, CSV_TYPE.SALES_RANK),
    subcategory_ranks: subcategoryRanks,
    rating: (() => {
      const raw_rating = getValueWithFallback(csv, statsCurrent, CSV_TYPE.RATING);
      return raw_rating != null ? raw_rating / 10 : null;
    })(),
    review_count: getValueWithFallback(csv, statsCurrent, CSV_TYPE.COUNT_REVIEWS),
    buy_box_seller_id: buyBoxSellerId,
    buy_box_is_amazon: buyBoxSellerId === "ATVPDKIKX0DER" ? true : buyBoxSellerId ? false : null,
    buy_box_price: getValueWithFallback(csv, statsCurrent, CSV_TYPE.BUY_BOX_SHIPPING, { isPriceCents: true }),
    images,
    features: raw.features ?? [],
    description: raw.description ?? null,
    parent_asin: raw.parentAsin ?? null,
    child_asins: childAsins,
    variation_attributes: variationAttributes,
    monthly_sold: raw.monthlySold ?? null,
    list_price: getValueWithFallback(csv, statsCurrent, CSV_TYPE.LIST_PRICE, { isPriceCents: true }),
    offer_count_new: getValueWithFallback(csv, statsCurrent, CSV_TYPE.COUNT_NEW),
    offer_count_used: getValueWithFallback(csv, statsCurrent, CSV_TYPE.COUNT_USED),
    offer_count_fba: raw.stats?.offerCountFBA ?? null,
    offer_count_fbm: raw.stats?.offerCountFBM ?? null,
    out_of_stock_percentage_30: (() => {
      const val = raw.stats?.outOfStockPercentage30?.[0];
      return val != null && val !== -1 ? val : null;
    })(),
    out_of_stock_percentage_90: (() => {
      const val = raw.stats?.outOfStockPercentage90?.[0];
      return val != null && val !== -1 ? val : null;
    })(),
    is_sns: raw.isSNS ?? null,
    frequently_bought_together: raw.frequentlyBoughtTogether ?? [],
  };
}

export function transformBuyBox(raw: KeepaProduct) {
  const buyBoxHistory = raw.buyBoxSellerIdHistory ?? raw.stats?.buyBoxSellerIdHistory ?? [];
  const csv = raw.csv ?? [];

  // Only include offers seen in the last 24 hours
  const recentThreshold = dateToKeepaTime(new Date(Date.now() - 24 * 60 * 60_000));
  const activeOffers = (raw.offers ?? []).filter(
    (o) => o.lastSeen != null && o.lastSeen >= recentThreshold
  );

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
    total_offers_tracked: (raw.offers ?? []).length,
    offers: activeOffers.map((o) => ({
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

export function transformSalesHistory(raw: KeepaProduct) {
  const history = decodeCsvTimeSeries(raw.monthlySoldHistory);
  return {
    asin: raw.asin,
    current_monthly_sold: raw.monthlySold ?? null,
    history,
  };
}

export function transformDeals(raw: KeepaProduct) {
  const csv = raw.csv ?? [];
  return {
    asin: raw.asin,
    coupon_history: decodeCouponTimeSeries(raw.couponHistory),
    promotions: (raw.promotions ?? []).map((p) => ({
      type: p.type ?? null,
      seller_id: p.sellerId ?? null,
      amount: p.amount != null ? p.amount / 100 : null,
      discount_percent: p.discountPercent ?? null,
    })),
    lightning_deal_history: decodeCsvTimeSeries(csv[CSV_TYPE.LIGHTNING_DEAL], {
      isPriceCents: true,
    }),
  };
}

export function transformSellerStats(raw: KeepaProduct) {
  const buyBoxStats = raw.stats?.buyBoxStats;
  if (!buyBoxStats) {
    return { asin: raw.asin, sellers: [] };
  }

  const sellers = Object.entries(buyBoxStats).map(([sellerId, stats]) => ({
    seller_id: sellerId,
    percentage_won: stats.percentageWon ?? null,
    avg_price: stats.avgPrice != null ? stats.avgPrice / 100 : null,
    avg_new_offer_count: stats.avgNewOfferCount ?? null,
    avg_used_offer_count:
      stats.avgUsedOfferCount != null && stats.avgUsedOfferCount !== -1
        ? stats.avgUsedOfferCount
        : null,
    is_fba: stats.isFBA ?? null,
    last_seen: stats.lastSeen != null ? keepaTimeToISO(stats.lastSeen) : null,
  }));

  return { asin: raw.asin, sellers };
}
