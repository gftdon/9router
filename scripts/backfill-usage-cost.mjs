#!/usr/bin/env node
/**
 * backfill-usage-cost.mjs
 *
 * Recompute `usageHistory.cost` for rows whose model had no pricing entry when
 * they were written, and fold the difference back into the `usageDaily`
 * pre-aggregates. Cost is calculated once at write time (usageRepo.saveRequestUsage)
 * and every read path just sums the stored column, so a pricing fix alone never
 * reaches historical rows.
 *
 * Imports the live resolver and the live cost math from
 * open-sse/providers/pricing.js — never reimplement either here, or this script
 * and production will drift.
 *
 * Talks to SQLite directly instead of going through src/lib/db/driver.js: that
 * module chain resolves the "@/" webpack alias, which plain Node cannot.
 *
 *   node scripts/backfill-usage-cost.mjs                      # dry run (default)
 *   node scripts/backfill-usage-cost.mjs --apply
 *   node scripts/backfill-usage-cost.mjs --model 'gpt-6%' --provider codex
 *   node scripts/backfill-usage-cost.mjs --zero-only --apply  # skip already-priced rows
 *
 * Stop the server first: it keeps an in-memory ring of recent rows and would
 * serve stale aggregates until restarted.
 */
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DATA_DIR } from "../src/lib/dataDir.js";
import { getLocalDateKey } from "../src/lib/db/helpers/dateKey.js";
import { getPricingForModel, calculateCostFromTokens } from "../open-sse/providers/pricing.js";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const APPLY = has("--apply");
const ZERO_ONLY = has("--zero-only");
const PROVIDER = val("--provider", "codex");
const MODEL_LIKE = val("--model", "gpt-6%");
const DB_FILE = path.join(DATA_DIR, "db", "data.sqlite");

const money = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2);

const db = new DatabaseSync(DB_FILE);
// The gateway may still be serving traffic on its own connection. Wait for the
// write lock rather than failing instantly.
db.exec("PRAGMA busy_timeout = 15000");

/** User overrides live in kv scope "pricing" (provider → { model: rates }) and
 *  win over the constants, exactly as pricingRepo.getPricingForModel does. */
function loadUserPricing() {
  const out = {};
  for (const r of db.prepare(`SELECT key, value FROM kv WHERE scope = 'pricing'`).all()) {
    try { out[r.key] = JSON.parse(r.value); } catch { /* skip malformed */ }
  }
  return out;
}
const userPricing = loadUserPricing();
const resolvePricing = (provider, model) =>
  (provider && userPricing[provider]?.[model]) || getPricingForModel(provider, model);

const rows = db.prepare(
  `SELECT id, timestamp, provider, model, connectionId, apiKey, endpoint, cost, tokens
     FROM usageHistory
    WHERE provider = ? AND model LIKE ?${ZERO_ONLY ? " AND cost = 0" : ""}
    ORDER BY id`
).all(PROVIDER, MODEL_LIKE);

console.log(`db      ${DB_FILE}`);
console.log(`filter  provider=${PROVIDER} model LIKE ${MODEL_LIKE}${ZERO_ONLY ? " cost=0" : ""}`);
console.log(`rows    ${rows.length}\n`);

const updates = [];          // { id, newCost }
const dayDeltas = new Map(); // dateKey → [{ delta, row }]
const summary = new Map();   // model → { n, old, new }
const unpriced = new Set();

for (const r of rows) {
  const pricing = resolvePricing(r.provider, r.model);
  if (!pricing) { unpriced.add(`${r.provider}|${r.model}`); continue; }

  let tokens;
  try { tokens = JSON.parse(r.tokens || "{}"); } catch { tokens = {}; }

  const oldCost = r.cost || 0;
  const newCost = calculateCostFromTokens(tokens, pricing);

  const s = summary.get(r.model) || { n: 0, old: 0, new: 0 };
  s.n++; s.old += oldCost; s.new += newCost;
  summary.set(r.model, s);

  const delta = newCost - oldCost;
  if (Math.abs(delta) < 1e-12) continue;

  updates.push({ id: r.id, newCost });
  const key = getLocalDateKey(r.timestamp);
  if (!dayDeltas.has(key)) dayDeltas.set(key, []);
  dayDeltas.get(key).push({ delta, row: r });
}

console.log("model".padEnd(24) + "req".padStart(7) + "stored".padStart(13) + "correct".padStart(13) + "delta".padStart(13));
let tOld = 0, tNew = 0, tReq = 0;
for (const [model, s] of [...summary].sort((a, b) => b[1].new - a[1].new)) {
  console.log(model.padEnd(24) + String(s.n).padStart(7) + money(s.old).padStart(13) + money(s.new).padStart(13) + money(s.new - s.old).padStart(13));
  tOld += s.old; tNew += s.new; tReq += s.n;
}
console.log("TOTAL".padEnd(24) + String(tReq).padStart(7) + money(tOld).padStart(13) + money(tNew).padStart(13) + money(tNew - tOld).padStart(13));
console.log(`\nrows to update: ${updates.length}   days touched: ${dayDeltas.size}`);
if (unpriced.size) console.log(`still unpriced (skipped): ${[...unpriced].join(", ")}`);

if (!APPLY) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply (back up data.sqlite first).");
  db.close();
  process.exit(0);
}

/** Mirrors aggregateEntryToDay's key shapes (src/lib/db/repos/usageRepo.js).
 *  Every bucket that received this row's cost has to receive the delta too. */
function bucketKeys(r) {
  const model = r.model;
  const provider = r.provider;
  const keys = [];
  if (provider) keys.push(["byProvider", provider]);
  keys.push(["byModel", provider ? `${model}|${provider}` : model]);
  if (r.connectionId) keys.push(["byAccount", r.connectionId]);
  const apiKeyVal = r.apiKey && typeof r.apiKey === "string" ? r.apiKey : "local-no-key";
  keys.push(["byApiKey", `${apiKeyVal}|${model}|${provider || "unknown"}`]);
  keys.push(["byEndpoint", `${r.endpoint || "Unknown"}|${model}|${provider || "unknown"}`]);
  return keys;
}

// IMMEDIATE, not deferred: we read each usageDaily blob, mutate it and write it
// back, so a concurrent request logged by a running server between our read and
// our write would be silently overwritten. Taking the write lock up front makes
// that impossible — a live server may fail to record a request or two while we
// hold it, which it already handles, and that is the cheaper loss.
db.exec("BEGIN IMMEDIATE");
try {
  const upd = db.prepare(`UPDATE usageHistory SET cost = ? WHERE id = ?`);
  for (const u of updates) upd.run(u.newCost, u.id);

  const selDay = db.prepare(`SELECT data FROM usageDaily WHERE dateKey = ?`);
  const updDay = db.prepare(
    `INSERT INTO usageDaily(dateKey, data) VALUES(?, ?) ON CONFLICT(dateKey) DO UPDATE SET data = excluded.data`
  );
  let missingDays = 0;
  for (const [dateKey, entries] of dayDeltas) {
    const row = selDay.get(dateKey);
    if (!row) { missingDays++; continue; }
    const day = JSON.parse(row.data);
    for (const { delta, row: r } of entries) {
      day.cost = (day.cost || 0) + delta;
      for (const [bucket, key] of bucketKeys(r)) {
        if (day[bucket]?.[key]) day[bucket][key].cost = (day[bucket][key].cost || 0) + delta;
      }
    }
    updDay.run(dateKey, JSON.stringify(day));
  }
  db.exec("COMMIT");
  console.log(`\napplied: ${updates.length} rows, ${dayDeltas.size - missingDays} daily aggregates` +
    (missingDays ? ` (${missingDays} day(s) had no usageDaily row — history only)` : ""));
  console.log("Restart the server so its in-memory recent-usage ring reloads.");
} catch (e) {
  db.exec("ROLLBACK");
  console.error("FAILED — rolled back:", e);
  process.exitCode = 1;
}
db.close();
