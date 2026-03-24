# keepa-adapter

MCP server + OpenClaw skill for Amazon product monitoring via the [Keepa API](https://keepa.com/#!api). Track prices, BSR trends, buy box changes, variation families, and promotional impact for 100+ ASINs.

## Setup

```bash
git clone https://github.com/your-org/keepa-adapter.git
cd keepa-adapter
npm install
cp .env.example .env
# Edit .env and add your Keepa API key
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KEEPA_API_KEY` | Yes | — | Your Keepa API key |
| `KEEPA_TOKENS_PER_MINUTE` | No | `5` | Token refill rate for your Keepa plan |
| `KEEPA_DB_PATH` | No | `./keepa.db` | Path to SQLite database |

## Usage

### As an MCP Server (Claude Desktop)

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "keepa-adapter": {
      "command": "node",
      "args": ["/path/to/keepa-adapter/dist/index.js"],
      "env": {
        "KEEPA_API_KEY": "your_key_here"
      }
    }
  }
}
```

Or run in development mode:

```bash
npm run dev
```

### As an OpenClaw Skill (for bots)

```typescript
import { KeepaSkill } from "keepa-adapter";

const skill = new KeepaSkill({ apiKey: "your_key" });

// Fetch product data
const products = await skill.getProduct(["B0012ZQPKG"]);

// Get daily alerts for Telegram/Slack/etc.
const alerts = await skill.getAlerts();
const summary = await skill.getDailySummary();
```

### Daily Collection (Scheduler)

Run a one-time collection of all tracked ASINs:

```bash
# Via npm
npm run collect

# Or directly
npx tsx src/scheduler/runner.ts
```

Schedule with cron for daily monitoring:

```cron
0 6 * * * cd /path/to/keepa-adapter && KEEPA_API_KEY=xxx npm run collect
```

## MCP Tools Reference

### Read Tools

| Tool | Description |
|------|-------------|
| `keepa_get_product` | Fetch current product data for 1-100 ASINs (title, brand, prices, BSR, rating, buy box, images, features, variations) |
| `keepa_get_price_history` | Get price/rank/review time series history |
| `keepa_get_buy_box` | Get buy box ownership, seller info, and offers |
| `keepa_get_variations` | Get variation family tree (parent/child relationships) |
| `keepa_check_tokens` | Check remaining API tokens and refresh rate |

### Monitoring Tools

| Tool | Description |
|------|-------------|
| `keepa_track_asins` | Add ASINs to the monitoring list |
| `keepa_take_snapshot` | Fetch + store snapshot, return changes vs previous |
| `keepa_get_changes` | Query detected changes by ASIN, severity, or date range |
| `keepa_analyze_bsr_trend` | Analyze BSR trend and flag deterioration |
| `keepa_check_variations` | Check for orphaned children, parent changes, attribute drift |

### Promo Tools

| Tool | Description |
|------|-------------|
| `keepa_add_promo` | Register a promo event (coupon, Lightning Deal, etc.) |
| `keepa_list_promos` | List promo events for an ASIN |
| `keepa_analyze_promo_impact` | Measure rank/price lift before, during, and after a promo |

## Example Prompts

Once connected via Claude Desktop, try:

- "Show me product data for ASIN B0012ZQPKG"
- "Track these ASINs: B0012ZQPKG, B001234567"
- "Take a snapshot of all tracked ASINs and show me what changed"
- "Analyze the BSR trend for B0012ZQPKG over the last 10 days"
- "Check if any of my tracked products lost the buy box"
- "Add a coupon promo for B0012ZQPKG starting today"
- "How many API tokens do I have left?"

## Price Format

All price fields (`amazon_price`, `new_price`, `buy_box_price`) are returned in **dollars**, not cents. The adapter converts from Keepa's raw cent values automatically.

```
snapshot.new_price  →  35.99   (dollars, ready to display)
```

Do **not** divide by 100 — the conversion is already done. Keepa's API returns prices in cents (e.g. `3599`), but the adapter handles that internally.

## Change Detection Severity

When snapshots are compared, changes are classified:

| Severity | Triggers |
|----------|----------|
| **Critical** | Title changed, buy box seller changed, parent ASIN lost/changed (orphaned) |
| **Warning** | Images changed, BSR worsened >20%, Amazon price changed >10%, rating dropped |
| **Info** | Review count changed, features changed, description changed |

## Development

```bash
npm run build          # Build with tsup
npm test               # Run unit tests
npm run test:watch     # Watch mode
npm run test:integration  # Integration tests (requires KEEPA_API_KEY)
npm run discover       # Hit live API and save raw response for schema modeling
```

## Token Budget

Keepa charges tokens per API call. At 5 tokens/min (default plan):

- **7,200 tokens/day** — 100 ASINs daily is comfortable
- Batch up to 100 ASINs per call for efficiency
- Token cost is surfaced in every response so Claude/bots can plan ahead
- The rate limiter self-adjusts from API response headers

Upgrade your Keepa plan for faster sweeps and on-demand history pulls.

## License

MIT
