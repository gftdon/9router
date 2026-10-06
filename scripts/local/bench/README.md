# bench (local tooling)

Run one fixed Claude Code task under different 9router combo orders (or native Claude Code) and
score every run the same way. Built for comparing `9-orchestrator` / `9-deep-reasoner` /
`9-fast-worker` setups; the analysis side reuses `scripts/local/session-analysis/collect.mjs`.

The task lives outside git in a `bench.json` (default `analysis/bench/mm-bench-1/bench.json`,
`analysis/` is in `.git/info/exclude`): source repo, base commit, packet, hidden tests (read from
the reference commit at score time, never copied here), allowed/prohibited files, test commands
and the run matrix.

## Flow

```bash
node scripts/local/bench/bench.mjs prepare            # once: template clone at the base commit + pnpm install + baseline tests
node scripts/local/bench/bench.mjs matrix             # run ids
node scripts/local/bench/bench.mjs run N0             # native control
node scripts/local/bench/bench.mjs run 1.1            # reorders the 9-* combos, then runs
node scripts/local/bench/bench.mjs report             # analysis/bench/<name>/report.md
node scripts/local/bench/bench.mjs restore-combos     # combo orders back to before the first change
```

`run <id>`:
1. moves the run's three models to the front of the existing `9-*` combos (other models stay
   behind as fallback; strategy is `fallback`, so the first model serves unless it fails — the
   report's "served by" column shows any fallback). The first change saves the old orders to
   `<root>/combos-backup.json`.
2. copies the template to `<root>/runs/<id>-<stamp>` (APFS clone) — every run starts from the
   same tree, with history only up to the base commit and no remote.
3. starts Claude Code in tmux (`mmb-<run>`, clean env, `--settings ~/.claude/settings.json.9router`
   unless native), answers the folder-trust dialog, pastes the packet.
4. watches the transcript until the packet's done marker, or DNF (`limits.maxMinutes` /
   `limits.idleMinutes`), then exits the session, runs `collect.mjs --until <end>` into
   `analysis/runs/mmb1-<run>/` and scores.

Watch a run live with `tmux attach -t mmb-<run>` (detach `Ctrl-b d`). Options: `--tag r2` for a
repeat, `--bypass` to start Claude Code with `--dangerously-skip-permissions` (default: the
permission mode from your own settings).

## Score (100)

Hidden tests 40 (reference tests dropped into a scratch copy of the run's worktree: publish 15,
web 15, admin 5, typecheck 5) · copy-only 15 · scope 15 · `BENCH_RESULT.md` 5 · committed 5 ·
fast-worker ×2 5 · deep-reasoner ×2 5 · fast-worker web research 5 · worktree 5.
Self-test: the reference solution scores 85 without a transcript (process checks need one),
an untouched tree 15.

## Caveats

- Runs share provider accounts with everything else on the gateway; run one at a time for clean latency.
- The combos are the live `9-*` combos — other sessions using them during a run get the bench order.
- The tmux prompt detection is text-based; if a run does not start, attach and look.
- A run dir is a new project path, so per-project `/mcp` toggles of the source repo do not apply. The script
  copies the repo's `disabledMcpServers` from `~/.claude.json` (plus `deniedMcpServers` in bench.json) into the
  run's `.claude/settings.local.json` as `deniedMcpServers`. Without it the Vercel plugin adds 244 tools to
  every request (300 vs 61 in a real session).
- Explorer runs: a matrix entry with `"withExplorer": true` and `"packet": "<file>"` uses that packet, and an
  `"explorer"` model is moved to the front of the combo mapped by `combos.explorer`. Their process score asks for
  fast-worker ≥1 (5) and Explore ≥2 with web research by Explore (5) instead of fast-worker ≥2 (5) and web
  research by fast-worker (5), so the total stays 100.
- `"agentPatch": {"<agent file>": {"<frontmatter key>": "<value>"}}` writes a changed copy of
  `~/.claude/agents/<agent file>.md` into the run's `.claude/agents/` (project agents win over user agents), e.g.
  `{"explorer": {"model": "haiku"}}` so Explore goes to the combo mapped to haiku on 9router. Your own files stay as
  they are.
