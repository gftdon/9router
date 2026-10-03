// Session-aware usage (LP-032): aggregates usageHistory rows by the client-sent
// session id (Claude Code main agent + subagents share one id). Kept in its own
// module so upstream merges never touch it.
import { getAdapter } from "@/lib/db/driver.js";
import { parseJson } from "@/lib/db/helpers/jsonCol.js";

export const MAX_SESSION_ID_LENGTH = 256;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Sessions with at least one request inside [startDate, endDate] — each counts in
// full. The range is resolved first through idx_uh_ts so only those sessions get
// aggregated; without it every page load scans the whole (unbounded) table.
function buildRangeFilter(startDate, endDate) {
  const conds = ["sessionId IS NOT NULL"];
  const params = [];
  if (startDate) { conds.push("timestamp >= ?"); params.push(new Date(startDate).toISOString()); }
  if (endDate) { conds.push("timestamp <= ?"); params.push(new Date(endDate).toISOString()); }
  if (!params.length) return { where: "", params };
  return { where: `AND sessionId IN (SELECT sessionId FROM usageHistory WHERE ${conds.join(" AND ")})`, params };
}

const sessionAggSql = (where) => `
  SELECT sessionId,
         MIN(timestamp) AS firstAt,
         MAX(timestamp) AS lastAt,
         MIN(julianday(timestamp) * 86400000.0 - COALESCE(json_extract(meta, '$.latencyMs'), 0)) AS startMs,
         MAX(julianday(timestamp) * 86400000.0) AS endMs,
         COUNT(*) AS requests,
         COUNT(DISTINCT COALESCE(provider, '') || '/' || COALESCE(model, '')) AS modelCount,
         SUM(promptTokens) AS promptTokens,
         SUM(completionTokens) AS completionTokens,
         SUM(COALESCE(json_extract(tokens, '$.cached_tokens'), 0)) AS cachedTokens,
         SUM(COALESCE(json_extract(tokens, '$.cache_creation_input_tokens'), 0)) AS cacheCreationTokens,
         SUM(COALESCE(json_extract(tokens, '$.reasoning_tokens'), 0)) AS reasoningTokens,
         SUM(cost) AS cost,
         SUM(COALESCE(json_extract(meta, '$.latencyMs'), 0)) AS durationMs,
         MAX(json_extract(meta, '$.clientTool')) AS clientTool
  FROM usageHistory
  WHERE sessionId IS NOT NULL ${where}
  GROUP BY sessionId`;

// Rows are stamped when a request finishes, so a session starts at its earliest
// (finish − latency), not at its first timestamp.
const JULIAN_UNIX_EPOCH_MS = 2440587.5 * 86400000;

function shapeSession(row) {
  const startMs = Math.round(num(row.startMs) - JULIAN_UNIX_EPOCH_MS);
  const endMs = Math.round(num(row.endMs) - JULIAN_UNIX_EPOCH_MS);
  return {
    sessionId: row.sessionId,
    clientTool: row.clientTool || null,
    firstAt: new Date(startMs).toISOString(),
    lastAt: row.lastAt,
    wallClockMs: Math.max(0, endMs - startMs),
    requests: num(row.requests),
    modelCount: num(row.modelCount),
    promptTokens: num(row.promptTokens),
    completionTokens: num(row.completionTokens),
    cachedTokens: num(row.cachedTokens),
    cacheCreationTokens: num(row.cacheCreationTokens),
    reasoningTokens: num(row.reasoningTokens),
    cost: num(row.cost),
    durationMs: num(row.durationMs),
  };
}

export async function listSessions({ page = 1, pageSize = 20, startDate, endDate } = {}) {
  const db = await getAdapter();
  const { where, params } = buildRangeFilter(startDate, endDate);
  const filtered = sessionAggSql(where);

  const totalsRow = db.get(
    `SELECT COUNT(*) AS sessions, SUM(requests) AS requests,
            SUM(promptTokens) AS promptTokens, SUM(completionTokens) AS completionTokens,
            SUM(cachedTokens) AS cachedTokens, SUM(cacheCreationTokens) AS cacheCreationTokens,
            SUM(cost) AS cost, SUM(durationMs) AS durationMs
     FROM (${filtered})`,
    params
  ) || {};

  const totalItems = num(totalsRow.sessions);
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;
  const rows = db.all(`${filtered} ORDER BY lastAt DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);

  return {
    sessions: rows.map(shapeSession),
    totals: {
      sessions: totalItems,
      requests: num(totalsRow.requests),
      promptTokens: num(totalsRow.promptTokens),
      completionTokens: num(totalsRow.completionTokens),
      cachedTokens: num(totalsRow.cachedTokens),
      cacheCreationTokens: num(totalsRow.cacheCreationTokens),
      cost: num(totalsRow.cost),
      durationMs: num(totalsRow.durationMs),
    },
    pagination: { page, pageSize, totalItems, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

function emptyBucket(extra = {}) {
  return {
    ...extra,
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    cachedTokens: 0,
    cacheCreationTokens: 0,
    reasoningTokens: 0,
    cost: 0,
    durationMs: 0,
    firstAt: null,
    lastAt: null,
    startMs: null,
  };
}

function addRow(bucket, row, tokens, meta) {
  bucket.requests += 1;
  bucket.promptTokens += num(row.promptTokens);
  bucket.completionTokens += num(row.completionTokens);
  bucket.cachedTokens += num(tokens.cached_tokens);
  bucket.cacheCreationTokens += num(tokens.cache_creation_input_tokens);
  bucket.reasoningTokens += num(tokens.reasoning_tokens);
  bucket.cost += num(row.cost);
  bucket.durationMs += num(meta.latencyMs);
  const startMs = new Date(row.timestamp).getTime() - num(meta.latencyMs);
  if (bucket.startMs === null || startMs < bucket.startMs) {
    bucket.startMs = startMs;
    bucket.firstAt = new Date(startMs).toISOString();
  }
  if (!bucket.lastAt || row.timestamp > bucket.lastAt) bucket.lastAt = row.timestamp;
}

const stripStart = ({ startMs, ...rest }) => rest;

// Per-model breakdown of one session. Returns null when the session has no rows.
export async function getSessionBreakdown(sessionId) {
  const db = await getAdapter();
  const rows = db.all(
    `SELECT timestamp, provider, model, promptTokens, completionTokens, cost, tokens, meta
     FROM usageHistory WHERE sessionId = ? ORDER BY timestamp ASC`,
    [sessionId]
  );
  if (!rows.length) return null;

  const byModel = new Map();
  const totals = emptyBucket();
  let clientTool = null;

  for (const row of rows) {
    const tokens = parseJson(row.tokens, {}) || {};
    const meta = parseJson(row.meta, {}) || {};
    if (!clientTool && meta.clientTool) clientTool = meta.clientTool;
    const key = `${row.provider || ""}/${row.model || ""}`;
    if (!byModel.has(key)) byModel.set(key, emptyBucket({ provider: row.provider || "unknown", model: row.model || "unknown" }));
    addRow(byModel.get(key), row, tokens, meta);
    addRow(totals, row, tokens, meta);
  }

  const models = [...byModel.values()]
    .map((m) => ({ ...stripStart(m), avgLatencyMs: m.requests ? Math.round(m.durationMs / m.requests) : 0 }))
    .sort((a, b) => b.cost - a.cost || b.requests - a.requests);

  return {
    sessionId,
    clientTool,
    firstAt: totals.firstAt,
    lastAt: totals.lastAt,
    wallClockMs: Math.max(0, new Date(totals.lastAt).getTime() - totals.startMs),
    models,
    totals: { ...stripStart(totals), avgLatencyMs: totals.requests ? Math.round(totals.durationMs / totals.requests) : 0 },
  };
}
