import { z } from "zod";

// --- Keepa Product ---

export const KeepaProductSchema = z
  .object({
    asin: z.string(),
    domainId: z.number(),
    title: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    productGroup: z.string().nullable().optional(),
    parentAsin: z.string().nullable().optional(),
    variationCSV: z.string().nullable().optional(),
    csv: z.array(z.array(z.number()).nullable()).nullable().optional(),
    imagesCSV: z.string().nullable().optional(),
    images: z
      .array(
        z
          .object({
            l: z.string().nullable().optional(),
            lH: z.number().nullable().optional(),
            lW: z.number().nullable().optional(),
            m: z.string().nullable().optional(),
            mH: z.number().nullable().optional(),
            mW: z.number().nullable().optional(),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
    manufacturer: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    features: z.array(z.string()).nullable().optional(),
    categoryTree: z
      .array(
        z.object({
          catId: z.number(),
          name: z.string(),
        })
      )
      .nullable()
      .optional(),
    rootCategory: z.number().nullable().optional(),
    lastUpdate: z.number().nullable().optional(),
    lastPriceChange: z.number().nullable().optional(),
    stats: z
      .object({
        current: z.array(z.number().nullable()).nullable().optional(),
        avg: z.array(z.number().nullable()).nullable().optional(),
        avg30: z.array(z.number().nullable()).nullable().optional(),
        avg90: z.array(z.number().nullable()).nullable().optional(),
        avg180: z.array(z.number().nullable()).nullable().optional(),
        atIntervalStart: z.array(z.number().nullable()).nullable().optional(),
        min: z
          .array(z.array(z.number().nullable()).nullable())
          .nullable()
          .optional(),
        max: z
          .array(z.array(z.number().nullable()).nullable())
          .nullable()
          .optional(),
        buyBoxSellerIdHistory: z.array(z.string()).nullable().optional(),
        salesRankDrops30: z.number().nullable().optional(),
        salesRankDrops90: z.number().nullable().optional(),
        salesRankDrops180: z.number().nullable().optional(),
        buyBoxStats: z
          .record(
            z.string(),
            z
              .object({
                percentageWon: z.number().nullable().optional(),
                avgPrice: z.number().nullable().optional(),
                avgNewOfferCount: z.number().nullable().optional(),
                avgUsedOfferCount: z.number().nullable().optional(),
                isFBA: z.boolean().nullable().optional(),
                lastSeen: z.number().nullable().optional(),
              })
              .passthrough()
          )
          .nullable()
          .optional(),
        offerCountFBA: z.number().nullable().optional(),
        offerCountFBM: z.number().nullable().optional(),
        outOfStockPercentage30: z.array(z.number()).nullable().optional(),
        outOfStockPercentage90: z.array(z.number()).nullable().optional(),
        sellerIdsLowestFBA: z.array(z.string()).nullable().optional(),
        sellerIdsLowestFBM: z.array(z.string()).nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    offers: z
      .array(
        z
          .object({
            offerId: z.number().optional(),
            sellerId: z.string().nullable().optional(),
            sellerName: z.string().nullable().optional(),
            condition: z.number().nullable().optional(),
            isPrime: z.boolean().nullable().optional(),
            isFBA: z.boolean().nullable().optional(),
            isMAP: z.boolean().nullable().optional(),
            isShippable: z.boolean().nullable().optional(),
            isAddonItem: z.boolean().nullable().optional(),
            isPreorder: z.boolean().nullable().optional(),
            isWarehouseDeal: z.boolean().nullable().optional(),
            isScam: z.boolean().nullable().optional(),
            isBuyBoxWinner: z.boolean().nullable().optional(),
            lastSeen: z.number().nullable().optional(),
            offerCSV: z.array(z.number()).nullable().optional(),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
    buyBoxSellerIdHistory: z.array(z.string()).nullable().optional(),
    salesRanks: z.record(z.string(), z.array(z.number())).nullable().optional(),
    salesRankReference: z.number().nullable().optional(),
    salesRankReferenceHistory: z.array(z.number()).nullable().optional(),
    frequentlyBoughtTogether: z.array(z.string()).nullable().optional(),
    monthlySold: z.number().nullable().optional(),
    monthlySoldHistory: z.array(z.number()).nullable().optional(),
    coupon: z.array(z.number()).nullable().optional(),
    couponHistory: z.array(z.number()).nullable().optional(),
    promotions: z
      .array(
        z
          .object({
            type: z.string().nullable().optional(),
            sellerId: z.string().nullable().optional(),
            amount: z.number().nullable().optional(),
            discountPercent: z.number().nullable().optional(),
            snsBulkDiscountPercent: z.number().nullable().optional(),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
    isSNS: z.boolean().nullable().optional(),
    eanList: z.array(z.string()).nullable().optional(),
    upcList: z.array(z.string()).nullable().optional(),
    variations: z
      .array(
        z
          .object({
            asin: z.string(),
            attributes: z
              .array(
                z.object({
                  dimension: z.string(),
                  value: z.string(),
                })
              )
              .nullable()
              .optional(),
            image: z.string().nullable().optional(),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
    type: z.union([z.number(), z.string()]).nullable().optional(),
    availabilityAmazon: z.number().nullable().optional(),
    isAdultProduct: z.boolean().nullable().optional(),
    newPriceIsMAP: z.boolean().nullable().optional(),
    fbaFees: z
      .object({
        pickAndPackFee: z.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type KeepaProduct = z.infer<typeof KeepaProductSchema>;

// --- Keepa Product Response ---

export const KeepaProductResponseSchema = z.object({
  timestamp: z.number(),
  tokensLeft: z.number(),
  refillIn: z.number(),
  refillRate: z.number(),
  products: z.array(KeepaProductSchema).nullable().optional(),
});

export type KeepaProductResponse = z.infer<typeof KeepaProductResponseSchema>;

// --- Token Status ---

export const KeepaTokenStatusSchema = z.object({
  timestamp: z.number(),
  tokensLeft: z.number(),
  refillIn: z.number(),
  refillRate: z.number(),
});

export type KeepaTokenStatus = z.infer<typeof KeepaTokenStatusSchema>;

// --- Best Sellers ---

export const KeepaBestSellersResponseSchema = z.object({
  timestamp: z.number(),
  tokensLeft: z.number(),
  refillIn: z.number(),
  refillRate: z.number(),
  bestSellersList: z
    .object({
      domainId: z.number(),
      categoryId: z.number(),
      asinList: z.array(z.string()).nullable().optional(),
      lastUpdate: z.number(),
    })
    .passthrough()
    .nullable()
    .optional(),
});

// --- Category Lookup ---

export const KeepaCategorySchema = z
  .object({
    domainId: z.number(),
    catId: z.number(),
    name: z.string(),
    children: z.array(z.number()).nullable().optional(),
    parent: z.number().nullable().optional(),
    highestRank: z.number().nullable().optional(),
    productCount: z.number().nullable().optional(),
  })
  .passthrough();

export const KeepaCategoryResponseSchema = z.object({
  timestamp: z.number(),
  tokensLeft: z.number(),
  refillIn: z.number(),
  refillRate: z.number(),
  categories: z.record(z.string(), KeepaCategorySchema).nullable().optional(),
});
