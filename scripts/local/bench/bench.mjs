#!/usr/bin/env node
// Repeatable combo benchmark: run one fixed Claude Code task under different 9router combo
// orders (or native Claude Code) and score every run the same way.
//
// The task itself (repo, base commit, packet, hidden tests, scope, matrix) lives in a bench.json
// outside git (default analysis/bench/mm-bench-1/bench.json) so no project code is copied here.
//
//   node scripts/local/bench/bench.mjs prepare                 build the template clone at the base commit
//   node scripts/local/bench/bench.mjs matrix                  list run ids
//   node scripts/local/bench/bench.mjs combos <id> [--dry-run] move the run's models to the front of the 9-* combos
//   node scripts/local/bench/bench.mjs restore-combos          put the combo orders back as they were before the first change
//   node scripts/local/bench/bench.mjs run <id> [--tag r2] [--bypass]   copy template, launch Claude Code in tmux, paste packet, watch, score
//   node scripts/local/bench/bench.mjs watch <run>             (re)attach the watcher to a launched run
//   node scripts/local/bench/bench.mjs score <run>             hidden tests + scope + process checks
//   node scripts/local/bench/bench.mjs batch <id...|all> [--from <id>] [--restore]   run several ids in order (one at a time)
//   node scripts/local/bench/bench.mjs report                  table of all scored runs
//   node scripts/local/bench/bench.mjs stop <run>              kill the run's tmux session
//
// Common flag: --config <bench.json>. A <run> is the run name printed by `run` (e.g. 1.1-202610042315).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  else pos.push(argv[i]);
}
const expand = (p) => p.replace(/^~(?=$|\/)/, os.homedir());
const CONFIG_PATH = path.resolve(expand(flags.config || path.join(REPO, "analysis/bench/mm-bench-1/bench.json")));
const CFG = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const CFG_DIR = path.dirname(CONFIG_PATH);
const ROOT = expand(CFG.root);
const TEMPLATE = path.join(ROOT, "template");
const RUNS = path.join(ROOT, "runs");
const ROUTER_DB = expand(CFG.routerDb || "~/.9router/db/data.sqlite");
const SETTINGS_9R = expand(CFG.settings9router || "~/.claude/settings.json.9router");
const ANALYSIS_OUT = path.join(REPO, "analysis/runs");
const LABEL_PREFIX = CFG.labelPrefix || "mmb1-";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const log = (...a) => console.log(`[${new Date().toLocaleTimeString("en-GB")}]`, ...a);
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
const shOk = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });
// Agent type the explorer subagent reports in transcripts (~/.claude/agents/explorer.md declares name: Explore).
const EXPLORER_TYPE = CFG.explorerType || "Explore";
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
const readJson = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n"); };
const die = (m) => { console.error(m); process.exit(1); };

function matrixEntry(id) {
  const e = CFG.matrix.find((m) => m.id === id);
  if (!e) die(`unknown run id ${id} — see: bench.mjs matrix`);
  return e;
}

// Copy a directory, using APFS clones when the volume supports them.
function cloneDir(src, dst) {
  if (shOk("cp", ["-cR", src, dst]).status !== 0) sh("cp", ["-R", src, dst]);
}

// ---------- prepare ----------
function runTests(dir) {
  const out = {};
  for (const t of CFG.tests) {
    const t0 = Date.now();
    const r = shOk(t.cmd[0], t.cmd.slice(1), { cwd: dir, maxBuffer: 64 << 20 });
    const text = (r.stdout || "") + (r.stderr || "");
    const num = (k) => { const m = [...text.matchAll(new RegExp(`^# ${k} (\\d+)`, "gm"))]; return m.length ? m.reduce((a, x) => a + Number(x[1]), 0) : null; };
    out[t.id] = { exit: r.status, pass: num("pass"), fail: num("fail"), ms: Date.now() - t0 };
  }
  return out;
}

function prepare() {
  if (fs.existsSync(TEMPLATE) && !flags.force) die(`${TEMPLATE} exists — pass --force to rebuild`);
  fs.rmSync(TEMPLATE, { recursive: true, force: true });
  fs.mkdirSync(ROOT, { recursive: true });
  const sha = sh("git", ["-C", expand(CFG.repo), "rev-parse", CFG.base]).trim();
  // Fetch only the base commit and its ancestors: no remote, no later branches, so the
  // reference solution is not reachable from inside a run.
  sh("git", ["init", "-q", "-b", "main", TEMPLATE]);
  sh("git", ["-C", TEMPLATE, "fetch", "-q", "--no-tags", expand(CFG.repo), sha]);
  sh("git", ["-C", TEMPLATE, "checkout", "-q", "-B", "main", "FETCH_HEAD"]);
  for (const [rel, content] of Object.entries(CFG.localSettings || {})) writeJson(path.join(TEMPLATE, rel), content);
  log("pnpm install");
  sh("pnpm", ["install", "--frozen-lockfile"], { cwd: TEMPLATE, stdio: "inherit" });
  log("baseline tests");
  const baseline = runTests(TEMPLATE);
  writeJson(path.join(ROOT, "baseline.json"), { base: sha, at: now(), tests: baseline });
  console.table(baseline);
}

// ---------- combos ----------
function readCombos() {
  const names = Object.values(CFG.combos).map((n) => `'${n.replace(/'/g, "''")}'`).join(",");
  const rows = JSON.parse(sh("sqlite3", ["-readonly", "-json", ROUTER_DB, `SELECT id, name, models FROM combos WHERE name IN (${names})`]) || "[]");
  return Object.fromEntries(rows.map((r) => [r.name, { id: r.id, models: JSON.parse(r.models) }]));
}

function writeCombo(id, models) {
  const json = JSON.stringify(models).replace(/'/g, "''");
  sh("sqlite3", ["-cmd", ".timeout 5000", ROUTER_DB, `UPDATE combos SET models = '${json}', updatedAt = '${now()}' WHERE id = '${id}'`]);
}

function setCombos(id, { dryRun = false } = {}) {
  const entry = matrixEntry(id);
  if (entry.native) { log(`${id} is native — combos untouched`); return null; }
  const current = readCombos();
  const backup = path.join(ROOT, "combos-backup.json");
  if (!dryRun && !fs.existsSync(backup)) writeJson(backup, { at: now(), combos: current });
  const result = {};
  for (const [role, comboName] of Object.entries(CFG.combos)) {
    const want = entry[role];
    if (!want) continue; // role not set for this entry (e.g. explorer): leave that combo as it is
    const c = current[comboName];
    if (!c) die(`combo ${comboName} not found in ${ROUTER_DB}`);
    // A model the combo does not have yet is added in front for this run; restore-combos (the backup) drops it again.
    const added = !c.models.includes(want);
    const models = [want, ...c.models.filter((m) => m !== want)];
    result[comboName] = models;
    const changed = JSON.stringify(models) !== JSON.stringify(c.models);
    log(`${comboName}: ${models[0]}${added ? " (added — not in the saved combo)" : changed ? "" : " (already first)"}  [${models.slice(1).join(", ")}]`);
    if (changed && !dryRun) writeCombo(c.id, models);
  }
  return result;
}

function restoreCombos() {
  const b = readJson(path.join(ROOT, "combos-backup.json"));
  if (!b) die("no combos-backup.json — nothing to restore");
  for (const [name, c] of Object.entries(b.combos)) { writeCombo(c.id, c.models); log(`${name} restored → ${c.models[0]}`); }
}

// ---------- run ----------
const tmuxName = (run) => `mmb-${run.replace(/[^A-Za-z0-9_-]/g, "_")}`;
const metaPath = (run) => path.join(RUNS, `${run}.json`);
// The transcript starts under the run dir's project folder and moves to the worktree's folder
// (…--claude-worktrees-<name>) once the session enters a worktree — look in every folder of the run.
function transcriptPath(meta) {
  const projects = path.join(os.homedir(), ".claude/projects");
  const prefix = meta.runDir.replace(/[^A-Za-z0-9]/g, "-");
  const dirs = fs.existsSync(projects) ? fs.readdirSync(projects).filter((d) => d === prefix || d.startsWith(prefix + "-")) : [];
  for (const d of dirs) { const f = path.join(projects, d, `${meta.sessionId}.jsonl`); if (fs.existsSync(f)) return f; }
  return path.join(projects, prefix, `${meta.sessionId}.jsonl`);
}
const capture = (sess) => shOk("tmux", ["capture-pane", "-p", "-t", sess]).stdout || "";

function claudeBin() {
  const r = shOk("/bin/sh", ["-c", "command -v claude"]);
  const bin = (CFG.claudeBin && expand(CFG.claudeBin)) || r.stdout.trim();
  if (!bin) die("claude binary not found in PATH");
  return bin;
}

// The source repo turns some MCP servers off per project (/mcp → ~/.claude.json projects[path].disabledMcpServers;
// e.g. the Vercel plugin, 244 tools). A run dir is a new project path, so those servers would come back on.
// Mirror them as deniedMcpServers in the run's local settings instead of writing ~/.claude.json, which
// running Claude Code sessions rewrite.
function mirrorDisabledMcp(runDir) {
  const project = readJson(path.join(os.homedir(), ".claude.json"))?.projects?.[expand(CFG.repo)] || {};
  const names = [...new Set([...(project.disabledMcpServers || []), ...(CFG.deniedMcpServers || [])])];
  if (!names.length) return names;
  const file = path.join(runDir, ".claude", "settings.local.json");
  const s = readJson(file) || {};
  const have = new Set((s.deniedMcpServers || []).map((d) => d.serverName));
  s.deniedMcpServers = [...(s.deniedMcpServers || []), ...names.filter((n) => !have.has(n)).map((serverName) => ({ serverName }))];
  writeJson(file, s);
  return names;
}

async function launch(id) {
  const entry = matrixEntry(id);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const run = `${id}${flags.tag ? `-${flags.tag}` : ""}-${stamp}`;
  if (!fs.existsSync(TEMPLATE)) die("no template — run: bench.mjs prepare");
  const combos = setCombos(id);
  fs.mkdirSync(RUNS, { recursive: true });
  const runDir = path.join(RUNS, run);
  log(`copy template → ${runDir}`);
  cloneDir(TEMPLATE, runDir);
  const denied = mirrorDisabledMcp(runDir);
  if (denied.length) log(`MCP servers off like in ${CFG.repo}: ${denied.join(", ")}`);
  const packetFile = path.join(RUNS, `${run}.packet.md`);
  fs.writeFileSync(packetFile, fs.readFileSync(path.join(CFG_DIR, entry.packet || CFG.packet), "utf8").replaceAll("{RUN_ID}", id));

  const sessionId = crypto.randomUUID();
  const sess = tmuxName(run);
  // Clean environment: a run started from inside another Claude Code session must not inherit its variables.
  const env = { HOME: os.homedir(), USER: os.userInfo().username, PATH: process.env.PATH, TERM: "xterm-256color", LANG: process.env.LANG || "en_US.UTF-8", SHELL: process.env.SHELL || "/bin/zsh", TMPDIR: os.tmpdir() };
  const args = [claudeBin(), "--session-id", sessionId, "--name", `bench-${run}`];
  if (!entry.native) {
    const s = readJson(SETTINGS_9R);
    if (!s?.env?.ANTHROPIC_BASE_URL) die(`${SETTINGS_9R} has no env.ANTHROPIC_BASE_URL`);
    env.ANTHROPIC_BASE_URL = s.env.ANTHROPIC_BASE_URL;
    // Same as claude9, which exports the token: with it in the process env Claude Code skips the claude.ai connectors.
    if (s.env.ANTHROPIC_AUTH_TOKEN) env.ANTHROPIC_AUTH_TOKEN = s.env.ANTHROPIC_AUTH_TOKEN;
    args.push("--settings", SETTINGS_9R);
  }
  if (flags.bypass) args.push("--dangerously-skip-permissions");
  // Values (incl. the gateway token) go through a 0700 launch file, never through tmux/ps argv;
  // the file removes itself before exec'ing Claude Code.
  const launchFile = path.join(RUNS, `.${run}.launch.sh`);
  fs.writeFileSync(launchFile, `#!/bin/sh\nrm -f ${q(launchFile)}\nexec env -i ${Object.entries(env).map(([k, v]) => `${k}=${q(v)}`).join(" ")} ${args.map(q).join(" ")}\n`, { mode: 0o700 });
  shOk("tmux", ["kill-session", "-t", sess]);
  sh("tmux", ["new-session", "-d", "-s", sess, "-x", "220", "-y", "60", "-c", runDir, `/bin/sh ${q(launchFile)}`]);
  const meta = { run, id, native: !!entry.native, bypass: !!flags.bypass, runDir, sessionId, tmux: sess, launchedAt: now(), combos, entry };
  writeJson(metaPath(run), meta);
  log(`tmux ${sess} · session ${sessionId} — watch live: tmux attach -t ${sess} (detach: Ctrl-b d)`);

  // Startup dialogs: folder trust is answered "yes" (the run dir is our own clone); anything else is left to a human.
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    await sleep(1000);
    const screen = capture(sess);
    // The trust dialog defaults to "No, exit" — move to "Yes, I trust this folder" first.
    if (/Yes, I trust this folder/i.test(screen)) { shOk("tmux", ["send-keys", "-t", sess, "Down"]); await sleep(300); shOk("tmux", ["send-keys", "-t", sess, "Enter"]); await sleep(2000); continue; }
    if (/Bypass Permissions mode/i.test(screen) && /Yes, I accept/i.test(screen)) { log("bypass confirmation dialog is open — answer it in tmux, then the watcher continues"); }
    if (/for shortcuts|auto mode|bypass permissions on|accept edits|\? for/i.test(screen)) ready = true;
  }
  if (!ready) log("prompt not detected after 60s — pasting anyway (check with tmux attach)");
  sh("tmux", ["load-buffer", "-b", sess, packetFile]);
  sh("tmux", ["paste-buffer", "-p", "-d", "-b", sess, "-t", sess]);
  await sleep(2000);
  shOk("tmux", ["send-keys", "-t", sess, "Enter"]);
  meta.startedAt = now();
  writeJson(metaPath(run), meta);
  // Make sure the packet was submitted (a long paste can need a second Enter).
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    if (fs.existsSync(transcriptPath(meta)) && fs.readFileSync(transcriptPath(meta), "utf8").includes("MM-BENCH")) break;
    if (i === 5 || i === 15) shOk("tmux", ["send-keys", "-t", sess, "Enter"]);
  }
  return run;
}

function lastActivity(meta) {
  const t = transcriptPath(meta);
  let m = fs.existsSync(t) ? fs.statSync(t).mtimeMs : 0;
  const sub = path.join(path.dirname(t), meta.sessionId, "subagents");
  if (fs.existsSync(sub)) for (const f of fs.readdirSync(sub)) m = Math.max(m, fs.statSync(path.join(sub, f)).mtimeMs);
  return m;
}

function doneInTranscript(meta) {
  const t = transcriptPath(meta);
  if (!fs.existsSync(t)) return false;
  for (const line of fs.readFileSync(t, "utf8").split("\n").reverse()) {
    if (!line.includes(CFG.limits.doneMarker)) continue;
    try {
      const e = JSON.parse(line);
      if (e.type !== "assistant") continue;
      const text = (e.message?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      if (text.trimStart().startsWith(CFG.limits.doneMarker) || text.includes(`\n${CFG.limits.doneMarker}`)) return true;
    } catch {}
  }
  return false;
}

async function watch(run) {
  const meta = readJson(metaPath(run)) || die(`no run ${run}`);
  const start = Date.parse(meta.startedAt || meta.launchedAt);
  const maxMs = CFG.limits.maxMinutes * 60e3, idleMs = CFG.limits.idleMinutes * 60e3;
  let status = null, lastPrint = 0;
  while (!status) {
    await sleep(15000);
    const t = Date.now(), act = lastActivity(meta);
    if (doneInTranscript(meta)) { await sleep(20000); status = "DONE"; break; }
    if (t - start > maxMs) status = `DNF (over ${CFG.limits.maxMinutes} min)`;
    else if (act && t - act > idleMs) status = `DNF (idle ${CFG.limits.idleMinutes} min)`;
    else if (shOk("tmux", ["has-session", "-t", meta.tmux]).status !== 0) status = "DNF (tmux session gone)";
    if (t - lastPrint > 60e3) { lastPrint = t; log(`${run}: ${Math.round((t - start) / 60e3)} min · last activity ${act ? Math.round((t - act) / 1000) + "s ago" : "none"}`); }
  }
  meta.endedAt = now();
  meta.status = status;
  writeJson(metaPath(run), meta);
  log(`${run}: ${status}`);
  // Keep the last screen of a stuck run (e.g. a permission prompt nobody answered) before the session goes away.
  if (status !== "DONE") {
    const screen = shOk("tmux", ["capture-pane", "-p", "-S", "-200", "-t", meta.tmux]).stdout || "";
    if (screen) { fs.writeFileSync(path.join(RUNS, `${run}.screen.txt`), screen); log(`${run}: last screen → ${RUNS}/${run}.screen.txt`); }
  }
  shOk("tmux", ["send-keys", "-t", meta.tmux, "/exit", "Enter"]);
  await sleep(4000);
  shOk("tmux", ["kill-session", "-t", meta.tmux]);
  collect(meta);
  score(run);
}

function collect(meta) {
  const args = [path.join(REPO, "scripts/local/session-analysis/collect.mjs"), "--session", meta.sessionId, "--label", LABEL_PREFIX + meta.run,
    "--until", meta.endedAt, "--out", ANALYSIS_OUT];
  if (!meta.native) args.push("--settings", SETTINGS_9R);
  const r = shOk("node", args, { cwd: REPO });
  log(`collect: ${r.status === 0 ? "ok" : "failed"} ${(r.stdout || "").trim().split("\n").pop()}`);
}

// ---------- score ----------
function globRe(g) {
  return new RegExp("^" + g.split("**").map((p) => p.split("*").map((s) => s.replace(/[.+^${}()|[\]\\?]/g, "\\$&")).join("[^/]*")).join(".*") + "$");
}

function findWorktree(runDir) {
  const r = shOk("git", ["-C", runDir, "worktree", "list", "--porcelain"]);
  const wts = (r.stdout || "").split("\n\n").map((b) => ({ path: b.match(/^worktree (.+)$/m)?.[1], branch: b.match(/^branch refs\/heads\/(.+)$/m)?.[1] })).filter((w) => w.path);
  return wts.find((w) => w.branch && /bench/i.test(w.branch)) || wts.find((w) => w.path !== runDir) || { path: runDir, branch: "main" };
}

function score(run) {
  const meta = readJson(metaPath(run)) || die(`no run ${run}`);
  const base = sh("git", ["-C", meta.runDir, "rev-parse", "main"]).trim();
  const wt = findWorktree(meta.runDir);
  const head = sh("git", ["-C", wt.path, "rev-parse", "HEAD"]).trim();
  const changed = [...new Set([
    ...sh("git", ["-C", wt.path, "diff", "--name-only", base]).split("\n"),
    ...sh("git", ["-C", wt.path, "ls-files", "--others", "--exclude-standard"]).split("\n"),
  ].filter(Boolean))];
  const allowed = CFG.scope.allowed.map(globRe), prohibited = CFG.scope.prohibited.map(globRe);
  const outside = changed.filter((f) => !allowed.some((re) => re.test(f)));
  const banned = changed.filter((f) => prohibited.some((re) => re.test(f)));
  const sources = changed.filter((f) => !/(^|\/)test\/|\.test\.ts$|^BENCH_RESULT\.md$/.test(f));
  // A source file outside the copy tables still counts as copy-only when its diff only touches comments.
  const commentOnly = (f) => {
    const d = shOk("git", ["-C", wt.path, "diff", base, "--unified=0", "--", f]).stdout || "";
    const lines = d.split("\n").filter((l) => /^[+-](?![+-])/.test(l)).map((l) => l.slice(1).trim()).filter(Boolean);
    return lines.length > 0 && lines.every((l) => /^(\/\/|\/\*|\*)/.test(l));
  };
  const copyOnly = sources.every((f) => CFG.scope.copyOnlySources.includes(f) || commentOnly(f));
  const benchResult = fs.existsSync(path.join(wt.path, "BENCH_RESULT.md"));

  // Hidden tests: the reference solution's tests, dropped into a scratch copy of the run's tree.
  const scratch = path.join(ROOT, "score", run);
  fs.rmSync(scratch, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(scratch), { recursive: true });
  cloneDir(wt.path, scratch);
  for (const f of CFG.hiddenTests) fs.writeFileSync(path.join(scratch, f), sh("git", ["-C", expand(CFG.repo), "show", `${CFG.reference}:${f}`]));
  if (!fs.existsSync(path.join(scratch, "node_modules"))) shOk("pnpm", ["install", "--frozen-lockfile", "--offline"], { cwd: scratch });
  const hidden = runTests(scratch);
  fs.rmSync(scratch, { recursive: true, force: true });

  const summary = readJson(path.join(ANALYSIS_OUT, LABEL_PREFIX + run, "summary.json"));
  const tools = (type) => (summary?.agentsDetail || []).filter((a) => a.agentType === type)
    .reduce((acc, a) => { for (const [k, v] of Object.entries(a.toolStats || {})) acc[k] = (acc[k] || 0) + v.calls; return acc; }, {});
  const byType = summary?.agents?.byType || {};
  const fwTools = tools("fast-worker"), mainTools = tools("main"), exTools = tools(EXPLORER_TYPE);
  // Entries with an explorer packet hand research to Explorer and leave fast-worker to implementation only.
  const withExplorer = !!matrixEntry(meta.id).withExplorer;
  const checks = {
    hidden_publish: [15, hidden.publish?.exit === 0],
    hidden_web: [15, hidden.web?.exit === 0],
    hidden_admin: [5, hidden.admin?.exit === 0],
    hidden_typecheck: [5, hidden.typecheck?.exit === 0],
    copy_only: [15, copyOnly && sources.length > 0],
    scope: [15, outside.length === 0 && banned.length === 0 && changed.length > 0],
    bench_result: [5, benchResult],
    committed: [5, head !== base],
    ...(withExplorer ? {
      fast_worker_impl: [5, (byType["fast-worker"] || 0) >= 1],
      explorer_x2: [5, (byType[EXPLORER_TYPE] || 0) >= 2],
      web_research: [5, (exTools.WebFetch || 0) + (exTools.WebSearch || 0) > 0],
    } : {
      fast_worker_x2: [5, (byType["fast-worker"] || 0) >= 2],
      web_research: [5, (fwTools.WebFetch || 0) + (fwTools.WebSearch || 0) > 0],
    }),
    deep_reasoner_x2: [5, (byType["deep-reasoner"] || 0) >= 2],
    worktree: [5, (mainTools.EnterWorktree || 0) > 0 || wt.path !== meta.runDir],
  };
  const total = Object.values(checks).reduce((a, [w, ok]) => a + (ok ? w : 0), 0);
  const result = {
    run, id: meta.id, status: meta.status, score: total, checks: Object.fromEntries(Object.entries(checks).map(([k, [w, ok]]) => [k, ok ? w : 0])),
    hidden, changed, outside, banned, worktree: wt, head,
    efficiency: summary && {
      wallMs: summary.wallMs, activeMs: summary.activeMs, apiCalls: summary.totals?.apiCalls, modelMs: summary.totals?.modelMs,
      outputTokens: summary.totals?.tokens?.output, cacheHitPct: summary.totals?.tokens?.cacheHitPct, subagents: byType,
      toolCalls: summary.totals?.toolCalls, toolErrors: summary.totals?.toolErrors, apiErrors: summary.totals?.apiErrorMessages,
      routerCost: summary.router?.totalCost ?? null, routerErrors: summary.router?.log?.errors ?? null, fallbacks: summary.router?.log?.fallbacks ?? null,
      served: summary.router ? Object.fromEntries(Object.entries(summary.router.byModel).map(([k, v]) => [k, v.requests])) : null,
    },
  };
  writeJson(path.join(RUNS, `${run}.score.json`), result);
  log(`${run}: score ${total}/100 · changed ${changed.length} file(s) · copy-only ${copyOnly} · hidden ${Object.entries(hidden).map(([k, v]) => `${k}=${v.exit === 0 ? "ok" : "FAIL"}`).join(" ")}`);
  return result;
}

// ---------- report ----------
function report() {
  const fmt = (ms) => (ms == null ? "-" : `${Math.floor(ms / 60e3)}m${String(Math.round((ms % 60e3) / 1000)).padStart(2, "0")}s`);
  const scores = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter((f) => f.endsWith(".score.json")).map((f) => readJson(path.join(RUNS, f))) : [];
  const order = CFG.matrix.map((m) => m.id);
  scores.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id) || a.run.localeCompare(b.run));
  const L = [`# ${CFG.name} results`, "", `Generated ${now()} · ${CFG.task}`, "",
    "| run | setup (orch / dr / fw) | status | score | wall | API calls | cost | errors / fallbacks | served by 9router |", "|---|---|---|---|---|---|---|---|---|"];
  for (const s of scores) {
    const m = matrixEntry(s.id), e = s.efficiency || {};
    const setup = (m.native ? "native" : [m.orchestrator, m.deepReasoner, m.fastWorker].join(" / ")) + (m.withExplorer ? ` + explorer${m.explorer ? ` (${m.explorer})` : ""}` : "");
    const served = e.served ? Object.entries(e.served).map(([k, v]) => `${k} ${v}`).join(", ") : "-";
    L.push(`| ${s.run} | ${setup} | ${s.status || "-"} | ${s.score} | ${fmt(e.wallMs)} | ${e.apiCalls ?? "-"} | ${e.routerCost != null ? "$" + e.routerCost : "-"} | ${e.routerErrors ?? "-"} / ${e.fallbacks ?? "-"} | ${served} |`);
  }
  L.push("", "Score: hidden tests 40 (publish 15, web 15, admin 5, typecheck 5) · copy-only 15 · scope 15 · BENCH_RESULT 5 · committed 5 · fast-worker ×2 5 · deep-reasoner ×2 5 · web research 5 · worktree 5.");
  const md = L.join("\n") + "\n";
  const out = path.join(CFG_DIR, "report.md");
  fs.writeFileSync(out, md);
  process.stdout.write(md);
  console.log(`wrote ${out}`);
}

// ---------- main ----------
const [cmd, arg] = pos;
switch (cmd) {
  case "prepare": prepare(); break;
  case "matrix": for (const m of CFG.matrix) console.log(m.id.padEnd(4), m.native ? m.note : `${m.orchestrator} / ${m.deepReasoner} / ${m.fastWorker}`); break;
  case "combos": setCombos(arg || die("usage: combos <id>"), { dryRun: !!flags["dry-run"] }); break;
  case "restore-combos": restoreCombos(); break;
  case "run": { const run = await launch(arg || die("usage: run <id>")); await watch(run); break; }
  case "watch": await watch(arg || die("usage: watch <run>")); break;
  case "batch": {
    let ids = pos.slice(1).includes("all") ? CFG.matrix.map((m) => m.id) : pos.slice(1);
    if (flags.from) ids = ids.slice(Math.max(0, ids.indexOf(flags.from)));
    if (!ids.length) die("usage: batch <id...|all> [--from <id>] [--restore]");
    log(`batch: ${ids.join(" ")}`);
    for (const id of ids) {
      try { const run = await launch(id); await watch(run); }
      catch (e) { log(`${id}: batch step failed — ${e.message}`); }
    }
    if (flags.restore) restoreCombos();
    report();
    break;
  }
  case "score": score(arg || die("usage: score <run>")); break;
  case "report": report(); break;
  case "stop": { const m = readJson(metaPath(arg)) || die(`no run ${arg}`); shOk("tmux", ["kill-session", "-t", m.tmux]); log(`stopped ${m.tmux}`); break; }
  default: console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 18).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
}
