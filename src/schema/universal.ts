import { z } from "zod";

// --- Pagination ---

export const PaginationSchema = z.object({
  current_page: z.number(),
  total_pages: z.number(),
  total_items: z.number(),
  has_more: z.boolean(),
});

// --- Error Detail ---

export const ErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  http_status: z.number().optional(),
});

// --- Token Metadata ---

export const TokenMetaSchema = z.object({
  consumed: z.number().optional(),
  remaining: z.number(),
  refill_in_ms: z.number(),
  refill_rate: z.number(),
});

// --- Universal Envelope ---

export const UniversalEnvelopeSchema = z.object({
  source: z.string(),
  adapter_version: z.string(),
  data_type: z.string(),
  marketplace: z.string().nullable().optional(),
  retrieved_at: z.string(),
  pagination: PaginationSchema.optional(),
  tokens: TokenMetaSchema.optional(),
  data: z.unknown(),
  error: ErrorDetailSchema.optional(),
});

export type UniversalEnvelope = z.infer<typeof UniversalEnvelopeSchema>;

// --- Subcategory Rank ---

export const SubcategoryRankSchema = z.object({
  category_id: z.number(),
  category_name: z.string().nullable(),
  rank: z.number().nullable(),
  is_primary: z.boolean(),
});

export type SubcategoryRank = z.infer<typeof SubcategoryRankSchema>;

// --- Product Snapshot ---

export const ProductSnapshotSchema = z.object({
  asin: z.string(),
  domain: z.string(),
  title: z.string().nullable(),
  brand: z.string().nullable(),
  amazon_price: z.number().nullable(),
  new_price: z.number().nullable(),
  sales_rank: z.number().nullable(),
  subcategory_ranks: z.array(SubcategoryRankSchema),
  rating: z.number().nullable(),
  review_count: z.number().nullable(),
  buy_box_seller_id: z.string().nullable(),
  buy_box_is_amazon: z.boolean().nullable(),
  buy_box_price: z.number().nullable(),
  images: z.array(z.string()),
  features: z.array(z.string()),
  description: z.string().nullable(),
  parent_asin: z.string().nullable(),
  child_asins: z.array(z.string()),
  variation_attributes: z.record(z.string(), z.string()).nullable(),
});

export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;

// --- Price History Point ---

export const PriceHistoryPointSchema = z.object({
  timestamp: z.string(),
  amazon_price: z.number().nullable(),
  new_price: z.number().nullable(),
  used_price: z.number().nullable(),
  sales_rank: z.number().nullable(),
  rating: z.number().nullable(),
  review_count: z.number().nullable(),
  buy_box_price: z.number().nullable(),
});

// --- Change Event ---

export const ChangeEventSchema = z.object({
  asin: z.string(),
  domain: z.string(),
  field: z.string(),
  old_value: z.string().nullable(),
  new_value: z.string().nullable(),
  severity: z.enum(["critical", "warning", "info"]),
  detected_at: z.string(),
});

export type ChangeEvent = z.infer<typeof ChangeEventSchema>;

// --- BSR Trend ---

export const BsrTrendSchema = z.object({
  asin: z.string(),
  period_days: z.number(),
  start_rank: z.number().nullable(),
  end_rank: z.number().nullable(),
  percent_change: z.number().nullable(),
  trend: z.enum(["improving", "stable", "declining", "critical_decline"]),
});

export type BsrTrend = z.infer<typeof BsrTrendSchema>;

// --- Variation Alert ---

export const VariationAlertSchema = z.object({
  asin: z.string(),
  alert_type: z.enum([
    "orphaned_child",
    "parent_changed",
    "attribute_drift",
    "children_added",
    "children_removed",
  ]),
  details: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
});

export type VariationAlert = z.infer<typeof VariationAlertSchema>;
