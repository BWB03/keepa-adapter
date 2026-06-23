# Amazon Monitoring Playbook

Use this playbook when `keepa-adapter` is connected to an MCP client or automation that monitors owned ASINs, competitor ASINs, or launch candidates.

The goal is to turn Keepa signals into operating decisions, not just alerts.

## 1. Segment The ASIN List

Group tracked ASINs before adding alerts:

| Segment | Examples | Primary Decision |
| --- | --- | --- |
| Owned live ASINs | Active listings, variations, launch SKUs | Protect price, rank, buy box, and availability |
| Direct competitors | Same keyword, price band, feature set | Detect pricing, promo, and rank pressure |
| Aspirational leaders | Best-in-class listings or brands | Learn launch benchmarks and promo cadence |
| Sourcing candidates | Ideas before purchase order | Validate stability and seasonality before buying stock |

## 2. Daily Snapshot Routine

Recommended daily routine:

1. Run `keepa_track_asins` for the monitored set.
2. Run `keepa_take_snapshot` after the marketplace's main price-change window.
3. Run `keepa_get_changes` filtered by `critical` and `warning` first.
4. Route each change to an action owner: listing, ads, pricing, inventory, or sourcing.
5. Log the action taken and review again after the next snapshot.

For scheduled collection, use the repository's daily collection command and keep API token limits in mind.

## 3. Action Rules By Signal

| Signal | Tool | Typical Action |
| --- | --- | --- |
| Buy box seller changed | `keepa_get_buy_box`, `keepa_get_changes` | Check offer eligibility, price, FBA status, stock, and seller competition |
| BSR worsened >20% | `keepa_analyze_bsr_trend` | Compare traffic, ads, price, coupon, stock, and competitor promo changes |
| Monthly sales dropped >30% | `keepa_get_sales_history` | Review keyword rank, price movement, stockout risk, and demand seasonality |
| Price changed >10% | `keepa_get_price_history` | Decide whether to match, hold margin, coupon, or reposition |
| Parent/child variation changed | `keepa_check_variations` | Check orphaned child, merged listing, attribute drift, and review distribution risk |
| Promo starts or ends | `keepa_get_deals`, `keepa_analyze_promo_impact` | Measure rank lift, margin cost, and post-promo decay |
| Offer count goes to zero | `keepa_get_product`, `keepa_get_changes` | Check stockout, suppression, or data issue before changing campaigns |

## 4. Competitor Monitoring Cadence

For competitors, avoid reacting to every small change. Use thresholds:

- Price move below 5%: record only unless it repeats.
- Coupon or Lightning Deal: compare with BSR and sales history before responding.
- Rank improvement without price/promo change: inspect listing content, reviews, and external traffic clues.
- Repeated buy box pressure: review seller stats and FBA/FBM positioning.

Output a weekly competitor readout:

```text
ASIN:
Main change:
Likely cause:
Impact on our product:
Recommended action:
Metric to review next:
```

## 5. Launch And Sourcing Validation

Before using a product as a sourcing benchmark, check:

- Stable price history instead of repeated discount dependency.
- Sales history that is not only a seasonal spike.
- Review and rating trend that supports conversion.
- Variation structure that is not hiding weak child ASINs.
- Promo impact that creates durable rank lift after the promo ends.

Use `Watch` instead of `Go` when Keepa data is incomplete, unstable, or driven by one short promotion window.

## 6. Alert Hygiene

- Keep `critical` alerts for changes that can damage revenue, rank, or listing integrity.
- Keep `warning` alerts for actions that need review but not immediate reaction.
- Do not page humans for ordinary review-count or minor price movement noise.
- Attach the recommended action to every alert so the MCP client does not only summarize data.