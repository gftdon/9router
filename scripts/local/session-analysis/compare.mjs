#!/usr/bin/env node
// Side-by-side comparison of run folders written by collect.mjs.
// Usage: node scripts/local/session-analysis/compare.mjs analysis/runs/<a> analysis/runs/<b> [...] [--out analysis/compare-<name>.md]
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const outIdx = argv.indexOf("--out");
const out = outIdx >= 0 ? argv.splice(outIdx, 2)[1] : null;
if (argv.length < 2) { console.error("usage: compare.mjs <runDirA> <runDirB> [...] [--out file.md]"); process.exit(2); }
const runs = argv.map((d) => JSON.parse(fs.readFileSync(path.join(d, "summary.json"), "utf8")));

const fmtDur = (m) => {
  if (!Number.isFinite(m)) return "-";
  const s = Math.round(m / 1000), h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60);
  return h ? `${h}h${String(mi).padStart(2, "0")}m` : mi ? `${mi}m${String(s % 60).padStart(2, "0")}s` : `${s}s`;
};
const n = (x) => (x ?? 0).toLocaleString();
const pct = (x) => (x == null ? "-" : `${x}%`);
const byType = (r, type) => r.agentsDetail.filter((a) => a.agentType === type);
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const models = (arr) => [...new Set(arr.flatMap((a) => Object.keys(a.byModel)))].join(", ") || "-";

const rows = [
  ["Session", (r) => `${r.titles.join(", ")} (${r.sessionId.slice(0, 8)})`],
  ["Via 9router", (r) => (r.via9router ? "yes" : "no")],
  ["Start (UTC)", (r) => r.start?.slice(0, 19).replace("T", " ")],
  ["**Wall clock**", (r) => `**${fmtDur(r.wallMs)}**`],
  ["Main waiting for human", (r) => fmtDur(r.mainIdleMs)],
  ["Main idle until background agents reported", (r) => fmtDur(r.mainWaitingForAgentsMs)],
  ["API calls (all agents)", (r) => n(r.totals.apiCalls)],
  ["Model time, sum over agents", (r) => fmtDur(r.totals.modelMs)],
  ["Tool time, sum over agents", (r) => fmtDur(r.totals.toolMs)],
  ["Tool calls (errors)", (r) => `${n(r.totals.toolCalls)} (${r.totals.toolErrors})`],
  ["API error messages", (r) => n(r.totals.apiErrorMessages)],
  ["Subagents (max concurrent)", (r) => `${r.agents.count} (${r.agents.maxConcurrent}) — ${Object.entries(r.agents.byType).map(([k, v]) => `${k}×${v}`).join(", ")}`],
  ["Cache hit (Claude Code view)", (r) => pct(r.totals.tokens.cacheHitPct)],
  ["Output tokens", (r) => n(r.totals.tokens.output)],
];
const agentRows = (type, label) => [
  [`**${label}** models`, (r) => models(byType(r, type))],
  [`${label}: count / wall (sum)`, (r) => `${byType(r, type).length} / ${fmtDur(sum(byType(r, type), (a) => a.wallMs))}`],
  [`${label}: API calls / model time`, (r) => `${sum(byType(r, type), (a) => a.apiCalls)} / ${fmtDur(sum(byType(r, type), (a) => a.modelMs))}`],
  [`${label}: avg / max call`, (r) => {
    const a = byType(r, type), calls = sum(a, (x) => x.apiCalls);
    return `${fmtDur(calls ? sum(a, (x) => x.modelMs) / calls : NaN)} / ${fmtDur(Math.max(0, ...a.map((x) => x.callDurationsMs?.max || 0)))}`;
  }],
  [`${label}: cache hit`, (r) => {
    const a = byType(r, type), read = sum(a, (x) => x.tokens.cacheRead), all = sum(a, (x) => x.tokens.promptTokens);
    return all ? pct(+(100 * read / all).toFixed(1)) : "-";
  }],
];
const table = [...rows, ...agentRows("main", "Main"), ...agentRows("deep-reasoner", "deep-reasoner"), ...agentRows("fast-worker", "fast-worker"), ...agentRows("codex:codex-rescue", "codex-rescue"),
  ["9router cost (gateway)", (r) => (r.router ? `$${r.router.totalCost}` : "- (native: see Claude plan usage)")],
  ["9router fallbacks / errors / stalls in log", (r) => (r.router ? `${r.router.log.fallbacks} / ${r.router.log.errors} / ${r.router.log.stallTimeouts}` : "-")],
];

const L = ["# Session comparison", "", `Generated ${new Date().toISOString()}`, "",
  `| metric | ${runs.map((r) => r.label).join(" | ")} |`, `|---|${runs.map(() => "---").join("|")}|`];
for (const [label, f] of table) L.push(`| ${label} | ${runs.map((r) => { try { return f(r) ?? "-"; } catch { return "-"; } }).join(" | ")} |`);

for (const r of runs.filter((x) => x.router)) {
  L.push("", `## 9router per model — ${r.label}`, "", "| provider/model | req (non-stream) | cache hit | 0-cache req | latency p50 / p90 / max | cost |", "|---|---|---|---|---|---|");
  for (const [k, b] of Object.entries(r.router.byModel)) L.push(`| ${k} | ${b.requests} (${b.nonStreamRequests ?? "?"}) | ${pct(b.cacheHitPct)} | ${b.zeroCacheRequests} | ${fmtDur(b.latency?.p50)} / ${fmtDur(b.latency?.p90)} / ${fmtDur(b.latency?.max)} | $${b.cost} |`);
}
L.push("", "## Notes", "",
  "- Model/tool time are sums across agents, so they can exceed wall clock when agents run in parallel.",
  "- \"Main idle until background agents reported\" = main ended its turn and was woken by a <task-notification>; it is the critical path waiting on subagents.",
  "- Token counts are what Claude Code received; for 9router runs the gateway table is the upstream view (cache per provider).",
  "- Check the task fingerprint (first prompt) in each summary.md to confirm the runs did the same task.");
const md = L.join("\n") + "\n";
if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, md); console.log(`wrote ${out}`); } else process.stdout.write(md);
