import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyPassthroughSuffixThinking } from "../../open-sse/translator/concerns/passthroughThinking.js";

// LP-037: native passthrough (Claude Code → cc/anthropic, gemini-cli, antigravity)
// skipped translateRequest, so a combo suffix like claude-opus-5-5(high) was only
// stripped and never applied — the upstream got the client's own thinking config.

const claudeBody = (extra = {}) => ({
  model: "claude-opus-5-5",
  max_tokens: 32000,
  thinking: { type: "enabled", budget_tokens: 31999 },
  messages: [{ role: "user", content: "hi" }],
  ...extra,
});

describe("applyPassthroughSuffixThinking — Claude wire", () => {
  it("turns (high) into adaptive thinking + output_config.effort", () => {
    const body = claudeBody();
    expect(applyPassthroughSuffixThinking("claude", "claude-opus-5-5(high)", body, "claude")).toBe("claude-adaptive");
    expect(body.thinking).toEqual({ type: "adaptive" });
    expect(body.output_config).toEqual({ effort: "high" });
    expect(body.max_tokens).toBe(32000);
  });

  it("applies to anthropic and anthropic-compatible providers too", () => {
    for (const provider of ["anthropic", "anthropic-compatible-acme"]) {
      const body = claudeBody();
      applyPassthroughSuffixThinking("claude", "claude-sonnet-5-5(medium)", body, provider);
      expect(body.output_config).toEqual({ effort: "medium" });
    }
  });

  it("keeps thinking.display and the client's other output_config fields", () => {
    const format = { type: "json_schema", schema: { type: "object" } };
    const body = claudeBody({
      thinking: { type: "enabled", budget_tokens: 31999, display: "summarized" },
      output_config: { effort: "low", format },
    });
    applyPassthroughSuffixThinking("claude", "claude-opus-5-5(medium)", body, "claude");
    expect(body.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(body.output_config).toEqual({ format, effort: "medium" });
  });

  it("(none) disables thinking", () => {
    const body = claudeBody();
    applyPassthroughSuffixThinking("claude", "claude-opus-5-5(none)", body, "claude");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config).toBeUndefined();
  });

  it("clamps xhigh to high on a model that does not advertise xhigh", () => {
    const body = claudeBody({ model: "claude-opus-4-6" });
    applyPassthroughSuffixThinking("claude", "claude-opus-4-6(xhigh)", body, "claude");
    expect(body.output_config).toEqual({ effort: "high" });
  });

  it("sends effort without the adaptive switch on always-thinking models", () => {
    const body = claudeBody({ model: "claude-fable-5-1" });
    applyPassthroughSuffixThinking("claude", "claude-fable-5-1(high)", body, "claude");
    expect(body.thinking).toBeUndefined();
    expect(body.output_config).toEqual({ effort: "high" });
  });

  it("keeps max_tokens above budget_tokens on budget-format models", () => {
    const body = claudeBody({ model: "claude-haiku-4-5" });
    expect(applyPassthroughSuffixThinking("claude", "claude-haiku-4-5(max)", body, "claude")).toBe("claude-budget");
    expect(body.thinking.type).toBe("enabled");
    expect(body.thinking.budget_tokens).toBeLessThan(body.max_tokens);
  });

  it("leaves the body untouched without a suffix", () => {
    const body = claudeBody({ output_config: { effort: "low" } });
    const before = structuredClone(body);
    expect(applyPassthroughSuffixThinking("claude", "claude-opus-5-5", body, "claude")).toBeNull();
    expect(body).toEqual(before);
  });
});

describe("applyPassthroughSuffixThinking — Gemini envelope wires", () => {
  const envelope = () => ({
    model: "gemini-3.8-flash",
    project: "p",
    request: { contents: [], generationConfig: { maxOutputTokens: 65536, thinkingConfig: { thinkingLevel: "low" } } },
  });

  it("writes thinkingConfig into the gemini-cli envelope", () => {
    const original = envelope();
    const body = { ...original };
    expect(applyPassthroughSuffixThinking("gemini-cli", "gemini-3.8-flash(high)", body, "gemini-cli")).toBe("gemini-level");
    expect(body.request.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "high", includeThoughts: true });
    // the shallow passthrough copy must not leak into the client's body (combo fallback reuses it)
    expect(original.request.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  it("skips a Claude model on the antigravity envelope (format the wire cannot carry)", () => {
    const body = { ...envelope(), model: "claude-sonnet-5-5" };
    const before = structuredClone(body);
    expect(applyPassthroughSuffixThinking("antigravity", "claude-sonnet-5-5(high)", body, "antigravity")).toBeNull();
    expect(body).toEqual(before);
  });

  it("ignores wires it does not handle", () => {
    const body = { model: "gpt-x", reasoning_effort: "low" };
    expect(applyPassthroughSuffixThinking("openai", "gpt-x(high)", body, "openai")).toBeNull();
    expect(body.reasoning_effort).toBe("low");
  });
});

// End-to-end through chatCore: the executor must receive the applied thinking.
const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("../../open-sse/executors/index.js", () => ({
  getExecutor: () => ({ noAuth: true, execute: executeMock }),
}));
vi.mock("../../open-sse/utils/requestLogger.js", () => ({
  createRequestLogger: async () => ({
    logClientRawRequest: vi.fn(), logRawRequest: vi.fn(), logTargetRequest: vi.fn(),
    logProviderResponse: vi.fn(), logConvertedResponse: vi.fn(), logError: vi.fn(),
  }),
}));
vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
}));

const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");

async function runClaudeCode(model) {
  const body = claudeBody({ stream: false });
  await handleChatCore({
    body,
    modelInfo: { provider: "claude", model },
    credentials: { accessToken: "test-token", providerSpecificData: {} },
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), line: vi.fn(), errorLine: vi.fn() },
    connectionId: "test-connection",
    rtkEnabled: false, headroomEnabled: false, cavemanEnabled: false, ponytailEnabled: false, pxpipeEnabled: false,
    sourceFormatOverride: "claude",
    clientRawRequest: { endpoint: "/v1/messages", body, headers: { "user-agent": "claude-cli/2.1.289 (external, cli)" } },
  }).catch(() => {});
  return { sent: executeMock.mock.calls.at(-1)?.[0]?.body, original: body };
}

describe("Claude Code passthrough through chatCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeMock.mockResolvedValue({
      response: new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { "content-type": "application/json" } }),
      url: "https://api.anthropic.com/v1/messages",
      headers: {},
      transformedBody: null,
    });
  });

  it("sends effort high for cc/claude-opus-5-5(high)", async () => {
    const { sent } = await runClaudeCode("claude-opus-5-5(high)");
    expect(sent.model).toBe("claude-opus-5-5");
    expect(sent.thinking).toEqual({ type: "adaptive" });
    expect(sent.output_config).toEqual({ effort: "high" });
  });

  it("forwards the client's thinking unchanged without a suffix", async () => {
    const { sent } = await runClaudeCode("claude-opus-5-5");
    expect(sent.thinking).toEqual({ type: "enabled", budget_tokens: 31999 });
    expect(sent.output_config).toBeUndefined();
  });
});
