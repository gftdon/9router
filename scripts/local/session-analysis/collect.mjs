#!/usr/bin/env node
// Collect everything needed to analyse one Claude Code session (main agent +
// subagents) and, when it ran through 9router, the gateway side of it.
// Output is a self-contained run folder that compare.mjs can diff against
// another run (e.g. Claude Code native vs a 9router combo setup).
//
// Usage:
//   node scripts/local/session-analysis/collect.mjs --session <uuid> --label <name> \
//        [--out analysis/runs] [--projects ~/.claude/projects] [--router-db ~/.9router/db/data.sqlite] \
//        [--router-log ~/.9router/logs] [--settings <claude settings.json>]
//
// Read-only: transcripts, the 9router SQLite DB (sqlite3 -readonly) and log files.
// Writes only into <out>/<label>/. No prompt bodies are copied — only counts,
// timings, tool names and short excerpts of the first prompt / final answer.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const HOME = os.homedir();
const args = parseArgs(process.argv.slice(2));
if (!args.session || !args.label) {
  console.error("usage: collect.mjs --session <uuid> --label <name> [--out analysis/runs]");
  process.exit(2);
}
const SESSION = args.session;
const PROJECTS = expand(args.projects || "~/.claude/projects");
const ROUTER_DB = expand(args["router-db"] || "~/.9router/db/data.sqlite");
const ROUTER_LOG_DIR = expand(args["router-log"] || "~/.9router/logs");
const OUT = path.resolve(args.out || "analysis/runs", args.label);
const EXCERPT = 600;

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) o[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  }
  return o;
}
function expand(p) { return p.startsWith("~") ? path.join(HOME, p.slice(1)) : p; }
const ms = (a, b) => new Date(b).getTime() - new Date(a).getTime();
const fmtDur = (m) => {
  if (!Number.isFinite(m)) return "-";
  const s = Math.round(m / 1000), h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60);
  return h ? `${h}h${String(mi).padStart(2, "0")}m` : mi ? `${mi}m${String(s % 60).padStart(2, "0")}s` : `${s}s`;
};
function readJsonl(file) {
  const out = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip partial line */ }
  }
  return out;
}
const textOf = (content) => typeof content === "string"
  ? content
  : Array.isArray(content) ? content.filter((b) => b?.type === "text").map((b) => b.text).join("\n") : "";
const redact = (s) => String(s)
  .replace(/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, "$1…")
  .replace(/("?(?:token|key|secret|password|authorization)"?\s*[:=]\s*"?)[^"\s,}]+/gi, "$1***");

// ---------- locate transcript ----------
function findTranscript() {
  for (const dir of fs.readdirSync(PROJECTS)) {
    const f = path.join(PROJECTS, dir, `${SESSION}.jsonl`);
    if (fs.existsSync(f)) return { file: f, dir: path.join(PROJECTS, dir) };
  }
  throw new Error(`transcript for ${SESSION} not found under ${PROJECTS}`);
}

// ---------- per-agent analysis ----------
// One API call = one message.id (Claude Code splits a response into one entry per content block).
function analyseAgent(entries, { name, agentType = "main", description = "" }) {
  const tsList = entries.map((e) => e.timestamp).filter(Boolean).sort();
  const calls = new Map(); // message.id → call
  const toolUses = new Map(); // tool_use id → {name, ts, input summary}
  const toolStats = {};
  const turns = [];
  const errors = { apiErrorMessages: 0, toolErrors: 0, systemSubtypes: {} };
  let lastInputTs = null; // last user/tool_result entry before a model call
  let firstPrompt = null, finalAnswer = null;
  const agentSpawns = [];

  for (const e of entries) {
    if (e.type === "system") {
      errors.systemSubtypes[e.subtype || "?"] = (errors.systemSubtypes[e.subtype || "?"] || 0) + 1;
      if (e.subtype === "turn_duration") turns.push({ ts: e.timestamp, durationMs: e.durationMs, messageCount: e.messageCount });
      continue;
    }
    if (e.type === "user") {
      const c = e.message?.content;
      if (Array.isArray(c)) {
        for (const b of c) {
          if (b?.type !== "tool_result") continue;
          const tu = toolUses.get(b.tool_use_id);
          if (tu) {
            tu.resultTs = e.timestamp;
            const st = (toolStats[tu.name] ||= { calls: 0, errors: 0, totalMs: 0, maxMs: 0 });
            const d = ms(tu.ts, e.timestamp);
            st.totalMs += d; st.maxMs = Math.max(st.maxMs, d);
            if (b.is_error) { st.errors++; errors.toolErrors++; }
          }
        }
      }
      if (!firstPrompt) {
        const t = textOf(c).trim();
        // A task handed over by another session arrives as a meta entry wrapping the prompt.
        const xs = t.match(/<cross-session-message[^>]*>([\s\S]*?)(?:<\/cross-session-message>|$)/);
        if (xs) firstPrompt = `[cross-session] ${xs[1].trim()}`.slice(0, EXCERPT);
        else if (t && !e.isMeta && !t.startsWith("<")) firstPrompt = t.slice(0, EXCERPT);
      }
      lastInputTs = e.timestamp;
      continue;
    }
    if (e.type !== "assistant") continue;
    if (e.isApiErrorMessage) errors.apiErrorMessages++;
    const m = e.message || {};
    const id = m.id || e.uuid;
    let call = calls.get(id);
    if (!call) {
      call = { id, model: m.model, start: lastInputTs || e.timestamp, end: e.timestamp, usage: m.usage || {}, stop: m.stop_reason, toolUses: 0, apiError: !!e.isApiErrorMessage };
      calls.set(id, call);
    }
    call.end = e.timestamp;
    if (m.stop_reason) call.stop = m.stop_reason;
    for (const b of m.content || []) {
      if (b?.type === "tool_use") {
        call.toolUses++;
        toolUses.set(b.id, { name: b.name, ts: e.timestamp });
        (toolStats[b.name] ||= { calls: 0, errors: 0, totalMs: 0, maxMs: 0 }).calls++;
        if (b.name === "Agent" || b.name === "Task") {
          agentSpawns.push({ ts: e.timestamp, toolUseId: b.id, subagentType: b.input?.subagent_type, description: b.input?.description, background: !!b.input?.run_in_background, model: b.input?.model || null });
        }
      }
      if (b?.type === "text" && b.text?.trim()) finalAnswer = b.text.trim().slice(0, EXCERPT);
    }
  }

  const callList = [...calls.values()].map((c) => ({ ...c, durationMs: Math.max(0, ms(c.start, c.end)) }));
  const byModel = {};
  const tok = { input: 0, cacheRead: 0, cacheCreation: 0, output: 0 };
  for (const c of callList) {
    const u = c.usage || {};
    const b = (byModel[c.model || "?"] ||= { calls: 0, modelMs: 0, input: 0, cacheRead: 0, cacheCreation: 0, output: 0, maxCallMs: 0 });
    b.calls++; b.modelMs += c.durationMs; b.maxCallMs = Math.max(b.maxCallMs, c.durationMs);
    for (const [k, src] of [["input", "input_tokens"], ["cacheRead", "cache_read_input_tokens"], ["cacheCreation", "cache_creation_input_tokens"], ["output", "output_tokens"]]) {
      b[k] += u[src] || 0; tok[k] += u[src] || 0;
    }
  }
  const modelMs = callList.reduce((a, c) => a + c.durationMs, 0);
  const toolMs = Object.values(toolStats).reduce((a, s) => a + s.totalMs, 0);
  const slowCalls = callList.filter((c) => c.durationMs >= 60000).sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 15).map((c) => ({ start: c.start, durationMs: c.durationMs, model: c.model, stop: c.stop, output: c.usage?.output_tokens || 0 }));
  const promptTokens = tok.input + tok.cacheRead + tok.cacheCreation;

  return {
    name, agentType, description,
    start: tsList[0] || null, end: tsList.at(-1) || null,
    wallMs: tsList.length ? ms(tsList[0], tsList.at(-1)) : 0,
    apiCalls: callList.length, modelMs, toolMs,
    avgCallMs: callList.length ? Math.round(modelMs / callList.length) : 0,
    callDurationsMs: percentiles(callList.map((c) => c.durationMs)),
    tokens: { ...tok, promptTokens, cacheHitPct: promptTokens ? +(100 * tok.cacheRead / promptTokens).toFixed(1) : null },
    byModel, toolStats, errors, turns, agentSpawns, slowCalls,
    firstPrompt, finalAnswer,
    _calls: callList,
  };
}
function percentiles(arr) {
  if (!arr.length) return {};
  const s = [...arr].sort((a, b) => a - b), p = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { p50: p(0.5), p90: p(0.9), p99: p(0.99), max: s.at(-1) };
}

// ---------- 9router side ----------
function sqliteJson(sql) {
  if (!fs.existsSync(ROUTER_DB)) return null;
  try {
    const out = execFileSync("sqlite3", ["-readonly", "-json", ROUTER_DB, sql], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    return out.trim() ? JSON.parse(out) : [];
  } catch (e) { return { error: e.message.split("\n")[0] }; }
}
function routerUsage(sessionId) {
  const rows = sqliteJson(`SELECT timestamp, provider, model, connectionId, promptTokens, completionTokens, cost, tokens, meta
    FROM usageHistory WHERE sessionId = 'claude:${sessionId.replace(/'/g, "")}' ORDER BY timestamp`);
  if (!Array.isArray(rows)) return { rows: [], error: rows?.error || "no router db" };
  return { rows: rows.map((r) => {
    const t = safeJson(r.tokens), m = safeJson(r.meta);
    return { timestamp: r.timestamp, provider: r.provider, model: r.model, prompt: r.promptTokens, completion: r.completionTokens,
      cached: t.cached_tokens || 0, cacheCreation: t.cache_creation_input_tokens || 0, reasoning: t.reasoning_tokens || 0,
      cost: r.cost || 0, latencyMs: m.latencyMs ?? null, ttftMs: m.ttftMs ?? null };
  }) };
}
const safeJson = (s) => { try { return JSON.parse(s || "{}") || {}; } catch { return {}; } };
function summariseRouter(rows) {
  const by = {};
  for (const r of rows) {
    const k = `${r.provider}/${r.model}`;
    const b = (by[k] ||= { requests: 0, nonStreamRequests: 0, prompt: 0, cached: 0, cacheCreation: 0, completion: 0, reasoning: 0, cost: 0, latencyMs: 0, zeroCacheRequests: 0, latencies: [], ttfts: [] });
    b.requests++; if (r.ttftMs == null) b.nonStreamRequests++; b.prompt += r.prompt || 0; b.cached += r.cached; b.cacheCreation += r.cacheCreation; b.completion += r.completion || 0;
    b.reasoning += r.reasoning; b.cost += r.cost; b.latencyMs += r.latencyMs || 0;
    if (!r.cached && (r.prompt || 0) > 4096) b.zeroCacheRequests++;
    if (r.latencyMs != null) b.latencies.push(r.latencyMs);
    if (r.ttftMs != null) b.ttfts.push(r.ttftMs);
  }
  for (const b of Object.values(by)) {
    b.cacheHitPct = b.prompt ? +(100 * b.cached / b.prompt).toFixed(1) : null;
    b.latency = percentiles(b.latencies); b.ttft = percentiles(b.ttfts);
    b.cost = +b.cost.toFixed(4); delete b.latencies; delete b.ttfts;
  }
  return by;
}

// server.log lines carry only local HH:MM:SS. Walk the file from its birth time and
// roll the day over whenever the clock goes backwards, then keep lines in [start, end].
function routerLogWindow(file, startIso, endIso) {
  if (!fs.existsSync(file)) return { lines: [], note: "missing" };
  const st = fs.statSync(file);
  let day = new Date(st.birthtimeMs || st.ctimeMs); day.setHours(0, 0, 0, 0);
  const start = new Date(startIso).getTime() - 60000, end = new Date(endIso).getTime() + 60000;
  let prevSec = -1, cur = null;
  const lines = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\[(\d\d):(\d\d):(\d\d)\]/.exec(line);
    if (m) {
      const sec = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
      if (prevSec >= 0 && sec + 3600 < prevSec) day = new Date(day.getTime() + 86400000);
      prevSec = sec;
      cur = day.getTime() + sec * 1000;
    }
    if (cur !== null && cur >= start && cur <= end) lines.push(line.replace(/ACC:\S+/g, "ACC:***").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "***@***"));
  }
  return { lines };
}
// The gateway log has no session id. Requests/fallbacks are attributed by combo name
// (the combos this Claude Code config maps to); errors stay gateway-wide.
function summariseRouterLog(lines, combos) {
  const s = { scope: `combos: ${[...combos].join(", ") || "all"} (other sessions on the same combos are included); errors are gateway-wide`,
    requests: 0, errors: 0, stallTimeouts: 0, fallbacks: 0, comboTries: {}, errorLines: [] };
  let combo = null;
  for (const l of lines) {
    const c = /\[CHAT\] Combo "([^"]+)"/.exec(l);
    if (c) combo = c[1];
    const p = /▶ POST (\S+) →/.exec(l);
    if (p && (!combos.size || combos.has(p[1]))) s.requests++;
    const t = /\[COMBO\] Trying model (\d+)\/\d+: (\S+)/.exec(l);
    if (t && (!combos.size || combos.has(combo))) { s.comboTries[t[2]] = (s.comboTries[t[2]] || 0) + 1; if (t[1] !== "1") s.fallbacks++; }
    if (/✗ ERROR|STALL TIMEOUT|Failed to convert/.test(l)) { s.errors++; s.errorLines.push(l.slice(0, 300)); }
    if (l.includes("stream stall timeout")) s.stallTimeouts++;
  }
  s.errorLines = s.errorLines.slice(0, 50);
  return s;
}

// ---------- environment snapshot ----------
function snapshotConfig(cwd) {
  const snap = {};
  const agentsDir = path.join(HOME, ".claude/agents");
  snap.agents = {};
  for (const a of ["fast-worker", "deep-reasoner"]) {
    const f = path.join(agentsDir, `${a}.md`);
    if (!fs.existsSync(f)) continue;
    const fm = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(f, "utf8"))?.[1] || "";
    snap.agents[a] = Object.fromEntries(fm.split("\n").filter((l) => /^(model|effort|tools|permissionMode):/.test(l)).map((l) => l.split(/:\s*/, 2)));
  }
  for (const [k, f] of [["settings", args.settings || path.join(HOME, ".claude/settings.json")], ["settings9router", path.join(HOME, ".claude/settings.json.9router")]]) {
    if (!fs.existsSync(f)) continue;
    const j = safeJson(fs.readFileSync(f, "utf8"));
    snap[k] = { model: j.model, effortLevel: j.effortLevel, alwaysThinkingEnabled: j.alwaysThinkingEnabled, modelSettings: j.modelSettings,
      env: Object.fromEntries(Object.entries(j.env || {}).filter(([n]) => !/TOKEN|KEY|SECRET|PASSWORD/i.test(n))) };
  }
  const combos = sqliteJson("SELECT name, models, updatedAt FROM combos ORDER BY name");
  if (Array.isArray(combos)) snap.combos = combos.map((c) => ({ name: c.name, models: safeJson(c.models), updatedAt: c.updatedAt }));
  try {
    const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
    snap.router = { gitHead: execFileSync("git", ["-C", repo, "log", "-1", "--format=%h %s"], { encoding: "utf8" }).trim(),
      version: safeJson(fs.readFileSync(path.join(repo, "package.json"), "utf8")).version };
  } catch { /* not in repo */ }
  if (cwd && fs.existsSync(cwd)) {
    try {
      const git = (...a) => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8" }).trim();
      snap.worktree = { cwd, branch: git("rev-parse", "--abbrev-ref", "HEAD"), head: git("log", "-1", "--format=%h %s"),
        status: git("status", "--short").split("\n").filter(Boolean).length + " changed paths" };
    } catch { /* not a git dir */ }
  }
  return snap;
}

function sessionCombos() {
  const f = path.join(HOME, ".claude/settings.json.9router");
  const env = fs.existsSync(f) ? safeJson(fs.readFileSync(f, "utf8")).env || {} : {};
  return new Set(Object.entries(env).filter(([k]) => /^ANTHROPIC_(DEFAULT_\w+_MODEL|CUSTOM_MODEL_OPTION)$/.test(k)).map(([, v]) => v));
}

// ---------- main ----------
const { file, dir } = findTranscript();
const mainEntries = readJsonl(file);
const titles = [...new Set(mainEntries.filter((e) => e.type === "custom-title").map((e) => e.customTitle))];
const cwd = mainEntries.find((e) => e.cwd)?.cwd || null;
const version = mainEntries.find((e) => e.version)?.version || null;
const main = analyseAgent(mainEntries, { name: "main" });

const subDir = path.join(dir, SESSION, "subagents");
const subs = [];
if (fs.existsSync(subDir)) {
  for (const f of fs.readdirSync(subDir).filter((n) => n.endsWith(".jsonl"))) {
    const meta = safeJson(fs.existsSync(path.join(subDir, f.replace(/\.jsonl$/, ".meta.json"))) ? fs.readFileSync(path.join(subDir, f.replace(/\.jsonl$/, ".meta.json")), "utf8") : "{}");
    subs.push({ ...analyseAgent(readJsonl(path.join(subDir, f)), { name: f.replace(/\.jsonl$/, ""), agentType: meta.agentType || "?", description: meta.description || "" }), meta });
  }
}
subs.sort((a, b) => String(a.start).localeCompare(String(b.start)));

const all = [main, ...subs];
const start = all.map((a) => a.start).filter(Boolean).sort()[0];
const end = all.map((a) => a.end).filter(Boolean).sort().at(-1);

// Gaps where main had ended its turn: either waiting for the human, or idling until a
// background subagent finished (the wake-up arrives as a <task-notification> user message).
let idleMs = 0, waitAgentsMs = 0;
{
  const ent = mainEntries.filter((e) => e.timestamp && (e.type === "user" || e.type === "assistant"));
  for (let i = 1; i < ent.length; i++) {
    const prev = ent[i - 1], curE = ent[i];
    if (!(prev.type === "assistant" && prev.message?.stop_reason === "end_turn" && curE.type === "user")) continue;
    const t = textOf(curE.message?.content).trimStart();
    if (t.startsWith("<task-notification")) waitAgentsMs += ms(prev.timestamp, curE.timestamp);
    else if (t && !t.startsWith("<")) idleMs += ms(prev.timestamp, curE.timestamp);
  }
}
// subagent concurrency: max number of subagents running at once
const events = subs.flatMap((s) => [[s.start, 1], [s.end, -1]]).filter(([t]) => t).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
let curCon = 0, maxCon = 0; for (const [, d] of events) { curCon += d; maxCon = Math.max(maxCon, curCon); }

const router = routerUsage(SESSION);
const usedRouter = router.rows.length > 0;
const logLines = usedRouter ? routerLogWindow(path.join(ROUTER_LOG_DIR, "server.log"), start, end).lines : [];
const errLines = usedRouter ? routerLogWindow(path.join(ROUTER_LOG_DIR, "server.error.log"), start, end).lines : [];

const summary = {
  label: args.label, sessionId: SESSION, titles, claudeCodeVersion: version, cwd,
  collectedAt: new Date().toISOString(), transcript: file,
  start, end, wallMs: ms(start, end), mainIdleMs: idleMs, mainWaitingForAgentsMs: waitAgentsMs, activeMs: ms(start, end) - idleMs,
  via9router: usedRouter,
  agents: { count: subs.length, maxConcurrent: maxCon, byType: subs.reduce((o, s) => ((o[s.agentType] = (o[s.agentType] || 0) + 1), o), {}) },
  totals: {
    apiCalls: all.reduce((a, x) => a + x.apiCalls, 0),
    modelMs: all.reduce((a, x) => a + x.modelMs, 0),
    toolMs: all.reduce((a, x) => a + x.toolMs, 0),
    toolCalls: all.reduce((a, x) => a + Object.values(x.toolStats).reduce((b, s) => b + s.calls, 0), 0),
    toolErrors: all.reduce((a, x) => a + x.errors.toolErrors, 0),
    apiErrorMessages: all.reduce((a, x) => a + x.errors.apiErrorMessages, 0),
    tokens: ["input", "cacheRead", "cacheCreation", "output"].reduce((o, k) => ((o[k] = all.reduce((a, x) => a + x.tokens[k], 0)), o), {}),
  },
  agentsDetail: all.map(({ _calls, ...rest }) => rest),
  router: usedRouter ? { byModel: summariseRouter(router.rows), totalCost: +router.rows.reduce((a, r) => a + r.cost, 0).toFixed(4), log: summariseRouterLog(logLines.concat(errLines), sessionCombos()), logCoverage: logLines.length ? "window" : "none (server log not enabled for this period?)" } : null,
  config: snapshotConfig(cwd),
};
{
  const t = summary.totals.tokens, p = t.input + t.cacheRead + t.cacheCreation;
  summary.totals.tokens.cacheHitPct = p ? +(100 * t.cacheRead / p).toFixed(1) : null;
}

// ---------- write ----------
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
const csv = (rows, cols) => [cols.join(","), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))].join("\n") + "\n";
const callRows = all.flatMap((a) => a._calls.map((c) => ({ agent: a.name, agentType: a.agentType, start: c.start, end: c.end, durationMs: c.durationMs, model: c.model, stop: c.stop, toolUses: c.toolUses,
  input: c.usage?.input_tokens || 0, cacheRead: c.usage?.cache_read_input_tokens || 0, cacheCreation: c.usage?.cache_creation_input_tokens || 0, output: c.usage?.output_tokens || 0, apiError: c.apiError })))
  .sort((a, b) => String(a.start).localeCompare(String(b.start)));
fs.writeFileSync(path.join(OUT, "calls.csv"), csv(callRows, ["agent", "agentType", "start", "end", "durationMs", "model", "stop", "toolUses", "input", "cacheRead", "cacheCreation", "output", "apiError"]));
if (usedRouter) {
  fs.writeFileSync(path.join(OUT, "router-usage.csv"), csv(router.rows, ["timestamp", "provider", "model", "prompt", "cached", "cacheCreation", "completion", "reasoning", "cost", "latencyMs", "ttftMs"]));
  fs.writeFileSync(path.join(OUT, "router-server.log"), logLines.join("\n") + "\n");
  fs.writeFileSync(path.join(OUT, "router-server.error.log"), errLines.join("\n") + "\n");
}
fs.writeFileSync(path.join(OUT, "summary.md"), renderMd(summary));
console.log(`wrote ${OUT}`);

function renderMd(s) {
  const L = [];
  L.push(`# ${s.label} — session ${s.sessionId}`, "");
  L.push(`- Title(s): ${s.titles.join(", ") || "-"} · Claude Code ${s.claudeCodeVersion || "?"} · via 9router: **${s.via9router ? "yes" : "no"}**`);
  L.push(`- cwd: \`${s.cwd}\``);
  L.push(`- Wall: **${fmtDur(s.wallMs)}** (${s.start} → ${s.end}) · main waiting for the human: ${fmtDur(s.mainIdleMs)} · main idle until background agents reported: ${fmtDur(s.mainWaitingForAgentsMs)} · wall minus human wait: **${fmtDur(s.activeMs)}**`);
  L.push(`- API calls: ${s.totals.apiCalls} · model time (sum, overlaps across agents): ${fmtDur(s.totals.modelMs)} · tool time: ${fmtDur(s.totals.toolMs)} · tool calls: ${s.totals.toolCalls} (errors ${s.totals.toolErrors}) · API error msgs: ${s.totals.apiErrorMessages}`);
  const t = s.totals.tokens;
  L.push(`- Tokens (Claude Code view): input ${t.input.toLocaleString()} · cache read ${t.cacheRead.toLocaleString()} · cache write ${t.cacheCreation.toLocaleString()} · output ${t.output.toLocaleString()} · cache hit ${t.cacheHitPct ?? "-"}%`);
  L.push(`- Subagents: ${s.agents.count} (${Object.entries(s.agents.byType).map(([k, v]) => `${k}×${v}`).join(", ") || "none"}) · max concurrent: ${s.agents.maxConcurrent}`, "");
  L.push("## Agents", "", "| agent | type | start | wall | API calls | model time | avg call | p90 call | tool time | tools (err) | cache hit | models |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const a of s.agentsDetail) {
    const tools = Object.values(a.toolStats).reduce((x, y) => x + y.calls, 0);
    L.push(`| ${a.name === "main" ? "main" : a.description || a.name} | ${a.agentType} | ${a.start?.slice(11, 19) || "-"} | ${fmtDur(a.wallMs)} | ${a.apiCalls} | ${fmtDur(a.modelMs)} | ${fmtDur(a.avgCallMs)} | ${fmtDur(a.callDurationsMs.p90)} | ${fmtDur(a.toolMs)} | ${tools} (${a.errors.toolErrors}) | ${a.tokens.cacheHitPct ?? "-"}% | ${Object.keys(a.byModel).join(", ")} |`);
  }
  L.push("", "## Slowest model calls (≥60s)", "");
  const slow = s.agentsDetail.flatMap((a) => a.slowCalls.map((c) => ({ ...c, agent: a.name === "main" ? "main" : a.agentType }))).sort((a, b) => b.durationMs - a.durationMs).slice(0, 15);
  L.push(slow.length ? "| agent | start | duration | model | stop | output tok |\n|---|---|---|---|---|---|\n" + slow.map((c) => `| ${c.agent} | ${c.start?.slice(11, 19)} | ${fmtDur(c.durationMs)} | ${c.model} | ${c.stop} | ${c.output} |`).join("\n") : "_none_");
  L.push("", "## Tools (all agents)", "", "| tool | calls | errors | total time | max |", "|---|---|---|---|---|");
  const tools = {};
  for (const a of s.agentsDetail) for (const [k, v] of Object.entries(a.toolStats)) { const t2 = (tools[k] ||= { calls: 0, errors: 0, totalMs: 0, maxMs: 0 }); t2.calls += v.calls; t2.errors += v.errors; t2.totalMs += v.totalMs; t2.maxMs = Math.max(t2.maxMs, v.maxMs); }
  for (const [k, v] of Object.entries(tools).sort((a, b) => b[1].totalMs - a[1].totalMs)) L.push(`| ${k} | ${v.calls} | ${v.errors} | ${fmtDur(v.totalMs)} | ${fmtDur(v.maxMs)} |`);
  if (s.router) {
    L.push("", "## 9router (gateway view)", "", `Total cost: $${s.router.totalCost} · log: ${s.router.logCoverage} · requests in log window: ${s.router.log.requests} · fallbacks: ${s.router.log.fallbacks} · errors: ${s.router.log.errors} · stall timeouts: ${s.router.log.stallTimeouts}`, "", `_Log scope: ${s.router.log.scope}. "non-stream" = client asked stream:false (no TTFT recorded)._`, "");
    L.push("| provider/model | req (non-stream) | prompt | cached | cache hit | 0-cache req | output | reasoning | cost | latency p50 / p90 / max | ttft p50 |", "|---|---|---|---|---|---|---|---|---|---|---|");
    for (const [k, b] of Object.entries(s.router.byModel)) L.push(`| ${k} | ${b.requests} (${b.nonStreamRequests}) | ${b.prompt.toLocaleString()} | ${b.cached.toLocaleString()} | ${b.cacheHitPct ?? "-"}% | ${b.zeroCacheRequests} | ${b.completion.toLocaleString()} | ${b.reasoning.toLocaleString()} | $${b.cost} | ${fmtDur(b.latency.p50)} / ${fmtDur(b.latency.p90)} / ${fmtDur(b.latency.max)} | ${fmtDur(b.ttft.p50)} |`);
    if (s.router.log.errorLines.length) L.push("", "Errors in window:", "", "```", ...s.router.log.errorLines.slice(0, 20), "```");
  }
  L.push("", "## Config snapshot (at collection time)", "", "```json", redact(JSON.stringify(s.config, null, 2)), "```");
  const fp = s.agentsDetail[0]?.firstPrompt, fa = s.agentsDetail[0]?.finalAnswer;
  L.push("", "## Task fingerprint", "", "First prompt (excerpt):", "", "```", fp || "-", "```", "", "Final answer (excerpt):", "", "```", fa || "-", "```");
  return L.join("\n") + "\n";
}
