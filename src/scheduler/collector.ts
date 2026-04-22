import type Database from "better-sqlite3";
import type { KeepaClient } from "../adapter/client.js";
import { getProduct } from "../adapter/endpoints.js";
import { transformProductSnapshot } from "../adapter/transformer.js";
import { insertSnapshot, getLatestSnapshot } from "../storage/snapshots.js";
import { insertChange } from "../storage/changes.js";
import { listTrackedAsins } from "../storage/tracked-asins.js";
import { detectChanges } from "../analysis/change-detection.js";
import type { ChangeEvent } from "../schema/universal.js";

export interface CollectionResult {
  snapshots: number;
  changes: ChangeEvent[];
  errors: Array<{ batch: string[]; error: string }>;
  duration_ms: number;
}

export async function runDailyCollection(
  client: KeepaClient,
  db: Database.Database,
  opts?: { domain?: string; batchSize?: number }
): Promise<CollectionResult> {
  const start = Date.now();
  const domain = opts?.domain ?? "com";
  const batchSize = opts?.batchSize ?? 100;

  const tracked = listTrackedAsins(db, { domain, activeOnly: true });
  const asins = tracked.map((t) => t.asin);

  let snapshotCount = 0;
  const allChanges: ChangeEvent[] = [];
  const errors: Array<{ batch: string[]; error: string }> = [];

  for (let i = 0; i < asins.length; i += batchSize) {
    const batch = asins.slice(i, i + batchSize);

    try {
      const res = await getProduct(client, {
        asins: batch,
        domain,
        stats: 30,
        rating: true,
      });

      for (const raw of res.data.products ?? []) {
        const snapshot = transformProductSnapshot(raw, domain);
        const previous = getLatestSnapshot(db, snapshot.asin, domain);

        insertSnapshot(db, snapshot, JSON.stringify(raw));
        snapshotCount++;

        if (previous) {
          const changes = detectChanges(previous, snapshot);
          for (const change of changes) {
            insertChange(db, change);
            allChanges.push(change);
          }
        }
      }
    } catch (err) {
      errors.push({
        batch,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    snapshots: snapshotCount,
    changes: allChanges,
    errors,
    duration_ms: Date.now() - start,
  };
}
