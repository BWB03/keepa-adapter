import type { ProductSnapshot, ChangeEvent } from "../schema/universal.js";

export function detectChanges(
  previous: ProductSnapshot,
  current: ProductSnapshot
): ChangeEvent[] {
  const now = new Date().toISOString();
  const changes: ChangeEvent[] = [];

  function addChange(
    field: string,
    oldVal: unknown,
    newVal: unknown,
    severity: "critical" | "warning" | "info"
  ) {
    changes.push({
      asin: current.asin,
      domain: current.domain,
      field,
      old_value: oldVal == null ? null : String(oldVal),
      new_value: newVal == null ? null : String(newVal),
      severity,
      detected_at: now,
    });
  }

  // Critical: title changed
  if (previous.title !== current.title) {
    addChange("title", previous.title, current.title, "critical");
  }

  // Critical: buy box seller changed
  if (previous.buy_box_seller_id !== current.buy_box_seller_id) {
    addChange(
      "buy_box_seller_id",
      previous.buy_box_seller_id,
      current.buy_box_seller_id,
      "critical"
    );
  }

  // Critical: parent ASIN changed or nulled (orphaned)
  if (previous.parent_asin !== current.parent_asin) {
    addChange(
      "parent_asin",
      previous.parent_asin,
      current.parent_asin,
      "critical"
    );
  }

  // Warning: images changed. Skip when previous was empty — that's first capture
  // (or recovery from a Keepa response that omitted imagesCSV), not a real image swap.
  if (previous.images.length > 0) {
    const prevImages = JSON.stringify(previous.images);
    const currImages = JSON.stringify(current.images);
    if (prevImages !== currImages) {
      addChange("images", prevImages, currImages, "warning");
    }
  }

  // Warning: sales rank worsened >20%
  if (
    previous.sales_rank != null &&
    current.sales_rank != null &&
    previous.sales_rank > 0
  ) {
    const pctChange =
      ((current.sales_rank - previous.sales_rank) / previous.sales_rank) * 100;
    if (pctChange > 20) {
      addChange(
        "sales_rank",
        previous.sales_rank,
        current.sales_rank,
        "warning"
      );
    }
  }

  // Warning: amazon price changed >10%
  if (
    previous.amazon_price != null &&
    current.amazon_price != null &&
    previous.amazon_price > 0
  ) {
    const pctChange =
      (Math.abs(current.amazon_price - previous.amazon_price) /
        previous.amazon_price) *
      100;
    if (pctChange > 10) {
      addChange(
        "amazon_price",
        previous.amazon_price,
        current.amazon_price,
        "warning"
      );
    }
  }

  // Warning: rating dropped
  if (
    previous.rating != null &&
    current.rating != null &&
    current.rating < previous.rating
  ) {
    addChange("rating", previous.rating, current.rating, "warning");
  }

  // Info: review count changed
  if (previous.review_count !== current.review_count) {
    addChange(
      "review_count",
      previous.review_count,
      current.review_count,
      "info"
    );
  }

  // Info: features changed
  const prevFeatures = JSON.stringify(previous.features);
  const currFeatures = JSON.stringify(current.features);
  if (prevFeatures !== currFeatures) {
    addChange("features", prevFeatures, currFeatures, "info");
  }

  // Info: description changed
  if (previous.description !== current.description) {
    addChange("description", previous.description, current.description, "info");
  }

  // Warning: monthly_sold dropped >30%
  if (
    previous.monthly_sold != null &&
    current.monthly_sold != null &&
    previous.monthly_sold > 0
  ) {
    const pctChange =
      ((previous.monthly_sold - current.monthly_sold) / previous.monthly_sold) * 100;
    if (pctChange > 30) {
      addChange(
        "monthly_sold",
        previous.monthly_sold,
        current.monthly_sold,
        "warning"
      );
    }
  }

  // Warning/Info: offer_count_new changes
  if (previous.offer_count_new !== current.offer_count_new) {
    if (current.offer_count_new === 0 && previous.offer_count_new != null && previous.offer_count_new > 0) {
      addChange("offer_count_new", previous.offer_count_new, current.offer_count_new, "warning");
    } else if (
      previous.offer_count_new != null &&
      current.offer_count_new != null &&
      previous.offer_count_new > 0
    ) {
      const pctChange =
        (Math.abs(current.offer_count_new - previous.offer_count_new) /
          previous.offer_count_new) *
        100;
      if (pctChange > 50) {
        addChange("offer_count_new", previous.offer_count_new, current.offer_count_new, "info");
      }
    }
  }

  // Warning: out_of_stock_percentage_30 increased by ≥10 points
  if (
    previous.out_of_stock_percentage_30 != null &&
    current.out_of_stock_percentage_30 != null
  ) {
    const pointIncrease =
      current.out_of_stock_percentage_30 - previous.out_of_stock_percentage_30;
    if (pointIncrease >= 10) {
      addChange(
        "out_of_stock_percentage_30",
        previous.out_of_stock_percentage_30,
        current.out_of_stock_percentage_30,
        "warning"
      );
    }
  }

  // Info: is_sns changed
  if (previous.is_sns !== current.is_sns) {
    addChange("is_sns", previous.is_sns, current.is_sns, "info");
  }

  // Warning: subcategory rank significant changes (>30% worsening in any subcat)
  if (previous.subcategory_ranks?.length && current.subcategory_ranks?.length) {
    for (const curr of current.subcategory_ranks) {
      const prev = previous.subcategory_ranks.find(
        (p) => p.category_id === curr.category_id
      );
      if (
        prev?.rank != null &&
        curr.rank != null &&
        prev.rank > 0
      ) {
        const pctChange = ((curr.rank - prev.rank) / prev.rank) * 100;
        if (pctChange > 30) {
          const label = curr.category_name ?? String(curr.category_id);
          addChange(
            `subcategory_rank:${label}`,
            prev.rank,
            curr.rank,
            "warning"
          );
        }
      }
    }
  }

  return changes;
}
