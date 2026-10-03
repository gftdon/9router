// LP-032: session-aware usage — session id extraction + Sessions tab aggregation.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { extractClientSessionId } from "../../open-sse/utils/sessionManager.js";

const UUID = "4f9a2b1c-1111-2222-3333-444455556666";

describe("extractClientSessionId", () => {
  it("reads the Claude Code session header", () => {
    expect(extractClientSessionId({ "x-claude-code-session-id": UUID }, {})).toBe(`claude:${UUID}`);
  });

  it("reads metadata.user_id in the legacy _session_ form", () => {
    const body = { metadata: { user_id: `user_abc_account_def_session_${UUID}` } };
    expect(extractClientSessionId({}, body)).toBe(`claude:${UUID}`);
  });

  it("reads metadata.user_id in the JSON form", () => {
    const body = { metadata: { user_id: JSON.stringify({ device_id: "d", session_id: UUID }) } };
    expect(extractClientSessionId({}, body)).toBe(`claude:${UUID}`);
  });

  it("returns null when the client sent no session id (no synthetic fallback)", () => {
    expect(extractClientSessionId({}, { messages: [{ role: "user", content: "hi" }] })).toBeNull();
  });
});

const DRIVERS = [
  { name: "default", mocks: [] },
  { name: "sql.js", mocks: ["@/lib/db/adapters/betterSqliteAdapter.js", "@/lib/db/adapters/nodeSqliteAdapter.js"] },
];

describe.each(DRIVERS)("session usage aggregation ($name driver)", ({ name, mocks }) => {
  let tempDir;
  let db;
  let sessionUsage;
  const originalDataDir = process.env.DATA_DIR;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-session-"));
    process.env.DATA_DIR = tempDir;
    delete global._dbAdapter;
    vi.resetModules();
    for (const m of mocks) vi.doMock(m, () => { throw new Error("simulated unavailable"); });
    db = await import("@/lib/db/index.js");
    await db.initDb();
    sessionUsage = await import("@/lib/usage/sessionUsage.js");
  });

  afterEach(() => {
    for (const m of mocks) vi.doUnmock(m);
    try { global._dbAdapter?.instance?.close?.(); } catch { /* noop */ }
    delete global._dbAdapter;
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    if (originalDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = originalDataDir;
  });

  const save = (overrides) => db.saveRequestUsage({
    provider: "claude",
    model: "claude-opus-5-5",
    connectionId: "c1",
    status: "ok",
    clientTool: "claude",
    ...overrides,
  });

  it("runs on the intended driver", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const adapter = await getAdapter();
    if (name === "sql.js") expect(adapter.driver).toBe("sql.js");
    else expect(adapter.driver).toBeTruthy();
  });

  it("groups by session, sums per model, and excludes rows without a session", async () => {
    const S = `claude:${UUID}`;
    await save({ sessionId: S, timestamp: "2026-10-03T01:00:00.000Z", latency: { total: 1000, ttft: 200 },
      tokens: { prompt_tokens: 1000, completion_tokens: 100, cached_tokens: 800, cache_creation_input_tokens: 50 } });
    await save({ sessionId: S, timestamp: "2026-10-03T01:05:00.000Z", latency: { total: 3000, ttft: 300 },
      tokens: { prompt_tokens: 2000, completion_tokens: 200, cached_tokens: 1500 } });
    // subagent on a different model, same session
    await save({ sessionId: S, provider: "codex", model: "gpt-6.1-sol-high", timestamp: "2026-10-03T01:10:00.000Z",
      latency: { total: 500 }, tokens: { prompt_tokens: 300, completion_tokens: 30, reasoning_tokens: 10 } });
    await save({ sessionId: "claude:other", timestamp: "2026-10-03T02:00:00.000Z", latency: { total: 100 },
      tokens: { prompt_tokens: 10, completion_tokens: 1 } });
    await save({ timestamp: "2026-10-03T03:00:00.000Z", tokens: { prompt_tokens: 99, completion_tokens: 9 } });

    const list = await sessionUsage.listSessions({ page: 1, pageSize: 20 });
    expect(list.totals.sessions).toBe(2);
    expect(list.sessions.map((s) => s.sessionId)).toEqual(["claude:other", S]); // newest first

    const s = list.sessions[1];
    expect(s.requests).toBe(3);
    expect(s.modelCount).toBe(2);
    expect(s.promptTokens).toBe(3300);
    expect(s.completionTokens).toBe(330);
    expect(s.cachedTokens).toBe(2300);
    expect(s.cacheCreationTokens).toBe(50);
    expect(s.durationMs).toBe(4500);
    // first request finished 01:00:00 after 1000ms → session started 00:59:59
    expect(s.firstAt).toBe("2026-10-03T00:59:59.000Z");
    expect(s.wallClockMs).toBe(10 * 60 * 1000 + 1000);
    expect(s.clientTool).toBe("claude");

    const b = await sessionUsage.getSessionBreakdown(S);
    expect(b.models).toHaveLength(2);
    const opus = b.models.find((m) => m.model === "claude-opus-5-5");
    expect(opus).toMatchObject({ requests: 2, promptTokens: 3000, completionTokens: 300, cachedTokens: 2300, durationMs: 4000, avgLatencyMs: 2000 });
    const gpt = b.models.find((m) => m.model === "gpt-6.1-sol-high");
    expect(gpt).toMatchObject({ provider: "codex", requests: 1, reasoningTokens: 10, durationMs: 500 });
    expect(b.totals.requests).toBe(3);
    expect(b.totals.cost).toBeCloseTo(b.models.reduce((a, m) => a + m.cost, 0), 10);
    expect(s.cost).toBeCloseTo(b.totals.cost, 10);
    expect(b.firstAt).toBe("2026-10-03T00:59:59.000Z");
    expect(b.wallClockMs).toBe(10 * 60 * 1000 + 1000);
    expect(opus.firstAt).toBe("2026-10-03T00:59:59.000Z");
    expect(gpt.firstAt).toBe("2026-10-03T01:09:59.500Z");
  });

  it("filters sessions overlapping the date range and returns null for unknown sessions", async () => {
    await save({ sessionId: "claude:early", timestamp: "2026-10-01T00:00:00.000Z", tokens: { prompt_tokens: 1, completion_tokens: 1 } });
    await save({ sessionId: "claude:late", timestamp: "2026-10-03T00:00:00.000Z", tokens: { prompt_tokens: 1, completion_tokens: 1 } });

    const list = await sessionUsage.listSessions({ startDate: "2026-10-02T00:00:00.000Z" });
    expect(list.sessions.map((s) => s.sessionId)).toEqual(["claude:late"]);
    expect(await sessionUsage.getSessionBreakdown("claude:missing")).toBeNull();
  });
});
