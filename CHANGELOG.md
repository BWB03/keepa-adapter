# Changelog

## Unreleased

### Fixed
- `keepa_get_seller_stats` now accepts an optional integer `stats_days` parameter and forwards it to Keepa instead of always requesting 30 days. Both seller stats and `keepa_get_product` use the shared `DEFAULT_STATS_DAYS` constant for the unchanged 30-day default.

## 1.2.0 - 2026-08-12

### Added
- Full route coverage for all 12 unique paths in Keepa's current API endpoint index: product and category search, Product Finder, Browsing Deals, seller information and finder, top sellers, Lightning Deals, graph images, and every Tracking API operation.
- POST support for large finder, deal, seller, and tracking payloads, plus binary PNG responses for graph images.
- Matching `KeepaSkill` library methods and endpoint-level mocked HTTP coverage tests.

### Fixed
- `keepa_get_price_history.days` now sends Keepa's `days` parameter instead of only changing the `stats` interval.
- Category lookups now explicitly send the required `parents` parameter.
- Token metadata includes `tokensConsumed`, and the local limiter mirrors Keepa's behavior when an expensive request drives a positive balance negative.
- Unsupported China and Australia domain mappings were removed, and Brazil is rejected on endpoints where Keepa does not support it.
- Local ASIN tracking, ASIN promotion history, and product-level seller stats are now clearly distinguished from Keepa's hosted Tracking, Browsing Deals, and Seller Information APIs.

## 1.1.1 - 2026-05-08

### Fixed
- **Stable MCPB download link for websites.** `npm run mcpb:pack` now writes both the versioned bundle and `release/keepa-adapter.mcpb`, so GitHub Releases can expose a permanent `/releases/latest/download/keepa-adapter.mcpb` URL that does not break on version bumps.

## 1.1.0 - 2026-05-07

### Fixed
- **Claude Desktop MCPB install now avoids native SQLite failures.** Replaced `better-sqlite3` with `sql.js`, a pure JavaScript/WebAssembly SQLite implementation, and moved the default database to `~/.keepa-adapter/keepa.db` so Claude's `/` working directory does not cause write failures.
- **Buy box data now populated correctly.** Added `buybox=1` parameter to Keepa API calls for `keepa_get_product`, `keepa_get_buy_box`, `keepa_get_seller_stats`, and `keepa_take_snapshot`. Previously these fields (`buy_box_seller_id`, `buy_box_price`, `out_of_stock_percentage`, `buyBoxStats`) were silently returned as null because the buy box module was never requested.

### Added
- **Configurable default marketplace.** Set `KEEPA_DEFAULT_DOMAIN` in your `.env` (e.g. `uk`, `de`, `jp`) so international users don't need to pass `domain` on every tool call. Defaults to `com` if unset.

### Token usage note
- The buy box fix increases token cost slightly for the four affected tools, as Keepa charges extra tokens for the buy box module (~2 additional tokens per ASIN). Normal usage should not be significantly impacted.
