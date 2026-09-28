/**
 * Local-timezone date key for the `usageDaily` table ("YYYY-MM-DD").
 *
 * Deliberately local, not UTC: the dashboard's day boundaries follow the
 * machine's clock. Lives here so the write path and any offline maintenance
 * script (scripts/backfill-usage-cost.mjs) bucket rows identically — a copy
 * that drifts would silently split one day across two keys.
 */
export function getLocalDateKey(timestamp) {
  const d = timestamp ? new Date(timestamp) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
