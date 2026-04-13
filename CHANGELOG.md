# Changelog

## 1.1.0 — 2026-04-13

### Fixed
- **Buy box data now populated correctly.** Added `buybox=1` parameter to Keepa API calls for `keepa_get_product`, `keepa_get_buy_box`, `keepa_get_seller_stats`, and `keepa_take_snapshot`. Previously these fields (`buy_box_seller_id`, `buy_box_price`, `out_of_stock_percentage`, `buyBoxStats`) were silently returned as null because the buy box module was never requested.

### Added
- **Configurable default marketplace.** Set `KEEPA_DEFAULT_DOMAIN` in your `.env` (e.g. `uk`, `de`, `jp`) so international users don't need to pass `domain` on every tool call. Defaults to `com` if unset.

### Token usage note
- The buy box fix increases token cost slightly for the four affected tools, as Keepa charges extra tokens for the buy box module (~2 additional tokens per ASIN). Normal usage should not be significantly impacted.
