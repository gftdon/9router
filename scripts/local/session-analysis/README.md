# session-analysis (local tooling)

Compare one Claude Code task run under different setups (native vs 9router,
or two 9router combo setups) using only data already on disk. Read-only: it
never touches the gateway or the transcripts.

## Collect one run

```bash
node scripts/local/session-analysis/collect.mjs \
  --session <session-uuid> --label <yyyy-mm-dd-setup-name>
```

- Find the session uuid: `custom-title` entries in `~/.claude/projects/*/*.jsonl` hold the session name
  (e.g. `grep -l '"customTitle":"MaeModAI"' ~/.claude/projects/*/*.jsonl`).
- A run counts as 9router when `usageHistory` (`~/.9router/db/data.sqlite`) has rows `sessionId = claude:<uuid>`;
  the script then exports those rows and the window of
  `~/.9router/logs/server*.log` covering the session.
- Put the setup in the label (`9router-orch-opus55-dr-sol-fw-muse`), since the combo can change after the run.

Output goes to `analysis/runs/<label>/` (`analysis/` is in `.git/info/exclude`):

| file | contents |
|---|---|
| `summary.md` | human-readable report: wall clock, idle split, per-agent calls/model time/tool time/cache, slow calls, task fingerprint, config snapshot |
| `summary.json` | same data, input for `compare.mjs` |
| `calls.csv` | one row per API call (agent, model, start, duration, tokens) |
| `router-usage.csv` | 9router only: gateway rows for the session (provider, model, latency, ttft, tokens, cost) |
| `router-server.log` / `router-server.error.log` | 9router only: log lines in the session window, account ids and emails redacted |

## Compare runs

```bash
node scripts/local/session-analysis/compare.mjs analysis/runs/<a> analysis/runs/<b> [...] \
  --out analysis/compare-<name>.md
```

## Caveats

- Re-run `collect.mjs` once a session has really finished; a still-running session is a snapshot.
- Gateway log errors are gateway-wide for the window. Requests/fallbacks are attributed to the session's combos
  (from `settings.json` `ANTHROPIC_*_MODEL`), but another session using the same combo at the same time is counted too.
- `usageHistory` per-session rows are exact (keyed by Claude session id).
- Stall details (`STALL TIMEOUT … chunks= bytes=`) only appear in logs from builds with LP-035.
- Model time = previous input entry → last entry of the response, so it includes queueing/TTFT inside 9router.
- Check the task fingerprint in both `summary.md` files to confirm the runs did the same task.
