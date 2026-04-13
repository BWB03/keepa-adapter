export const ADAPTER_VERSION = "1.0.0";
export const SOURCE = "keepa";
export const BASE_URL = "https://api.keepa.com";
export const DEFAULT_TIMEOUT_MS = 30_000;

// Keepa epoch: 2011-01-01T00:00:00.000Z in milliseconds
export const KEEPA_EPOCH_MS = 1293840000000;

// Keepa domain codes
export const KEEPA_DOMAINS: Record<string, number> = {
  com: 1,
  uk: 2,
  de: 3,
  fr: 4,
  jp: 5,
  ca: 6,
  cn: 7,
  it: 8,
  es: 9,
  in: 10,
  mx: 11,
  br: 12,
  au: 13,
};

// CSV type indices for Keepa's flat array format
export const CSV_TYPE = {
  AMAZON: 0,
  NEW: 1,
  USED: 2,
  SALES_RANK: 3,
  LIST_PRICE: 4,
  COLLECTIBLE: 5,
  REFURBISHED: 6,
  NEW_FBM_SHIPPING: 7,
  LIGHTNING_DEAL: 8,
  WAREHOUSE: 9,
  NEW_FBA: 10,
  COUNT_NEW: 11,
  COUNT_USED: 12,
  COUNT_REFURBISHED: 13,
  COUNT_COLLECTIBLE: 14,
  EXTRA_INFO_UPDATES: 15,
  RATING: 16,
  COUNT_REVIEWS: 17,
  BUY_BOX_SHIPPING: 18,
  USED_NEW_SHIPPING: 19,
  USED_VERY_GOOD_SHIPPING: 20,
  USED_GOOD_SHIPPING: 21,
  USED_ACCEPTABLE_SHIPPING: 22,
  COLLECTIBLE_NEW_SHIPPING: 23,
  COLLECTIBLE_VERY_GOOD_SHIPPING: 24,
  COLLECTIBLE_GOOD_SHIPPING: 25,
  COLLECTIBLE_ACCEPTABLE_SHIPPING: 26,
  REFURBISHED_SHIPPING: 27,
  TRADE_IN: 28,
  RENTAL: 29,
  BUY_BOX_USED_SHIPPING: 30,
  PRIME_EXCLUSIVE: 31,
} as const;

export const DEFAULT_DOMAIN = process.env.KEEPA_DEFAULT_DOMAIN ?? "com";
export const DEFAULT_STATS_DAYS = 30;
