import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("../../open-sse/executors/index.js", () => ({
  getExecutor: () => ({ noAuth: true, execute: executeMock }),
}));
vi.mock("../../open-sse/utils/requestLogger.js", () => ({
  createRequestLogger: async () => ({
    logClientRawRequest: vi.fn(), logRawRequest: vi.fn(),
    logTargetRequest: vi.fn(), logProviderResponse: vi.fn(),
    logConvertedResponse: vi.fn(), logError: vi.fn(),
  }),
}));
vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
}));
vi.mock("../../open-sse/handlers/chatCore/nonStreamingHandler.js", () => ({
  handleNonStreamingResponse: async () => ({ success: true, response: new Response("{}") }),
}));

const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");
const { handleComboChat } = await import("../../open-sse/services/combo.js");

// Synthetic opaque fixtures, not real user signatures. Modern Claude responses
// include empty thinking text and signatures outside the old E/R prefix scheme.
const nativeThinking = () => [
  { type: "thinking", thinking: "", signature: "CAIS-opaque-fixture" },
  { type: "redacted_thinking", data: "opaque-encrypted-fixture" },
  { type: "thinking", thinking: "Summary", signature: "future-opaque-format" },
];
const isThinking = (block) => ["thinking", "redacted_thinking"].includes(block.type);

async function dispatchNativeCombo(model, thinking, blocks) {
  const body = {
    model: "9-orchestrator", stream: false, max_tokens: 4096,
    ...(thinking ? { thinking } : {}),
    tools: [{ name: "Read", input_schema: { type: "object", properties: {} } }],
    messages: [
      { role: "user", content: "Read the package version." },
      { role: "assistant", content: [
        ...structuredClone(blocks),
        { type: "tool_use", id: "toolu_fixture", name: "Read", input: {} },
      ] },
      { role: "user", content: [
        { type: "tool_result", tool_use_id: "toolu_fixture", content: "0.5.81" },
      ] },
    ],
  };
  const log = { debug: vi.fn(), info: vi.fn(), warn: vi.fn() };
  const response = await handleComboChat({
    body, models: [`cc/${model}`], comboName: "9-orchestrator", log,
    handleSingleModel: async (request, modelStr) => {
      const result = await handleChatCore({
        body: request, modelInfo: { provider: "claude", model: modelStr.slice(3) },
        credentials: { accessToken: "fixture", providerSpecificData: {} },
        log, connectionId: "fixture", rtkEnabled: false, headroomEnabled: false,
        cavemanEnabled: false, ponytailEnabled: false, pxpipeEnabled: false,
        sourceFormatOverride: "claude",
        clientRawRequest: {
          endpoint: "/v1/messages", body: request,
          headers: { "user-agent": "claude-cli/2.1.278", accept: "application/json" },
        },
      });
      return result.response;
    },
  });
  expect(response.ok).toBe(true);
  expect(executeMock).toHaveBeenCalledTimes(1);
  return executeMock.mock.calls[0][0].body;
}

describe("Claude Code native combo thinking round-trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeMock.mockResolvedValue({
      response: new Response("{}", { headers: { "content-type": "application/json" } }),
      url: "https://api.anthropic.com/v1/messages", headers: {}, transformedBody: null,
    });
  });

  it.each([
    ["claude-opus-5(max)", "enabled"],
    ["claude-opus-5(max)", "adaptive"],
    ["claude-opus-5-5(max)", "enabled"],
    ["claude-opus-5-5(max)", "adaptive"],
    ["claude-fable-5(max)", "enabled"],
    ["claude-fable-5(max)", "adaptive"],
    ["claude-fable-5-1(xhigh)", "enabled"],
    ["claude-fable-5-1(xhigh)", "adaptive"],
  ])("preserves opaque and redacted blocks in order for %s / %s", async (model, type) => {
    const blocks = nativeThinking();
    const body = await dispatchNativeCombo(model, {
      type, ...(type === "enabled" ? { budget_tokens: 2048 } : {}),
    }, blocks);
    expect(body.messages[1].content.filter(isThinking)).toEqual(blocks);
    expect(body.messages[1].content.map(b => b.type)).toEqual([
      "thinking", "redacted_thinking", "thinking", "tool_use",
    ]);
  });

  it("preserves prior thinking even when the next request has thinking disabled", async () => {
    const blocks = nativeThinking();
    const body = await dispatchNativeCombo("claude-opus-5", { type: "disabled" }, blocks);
    expect(body.messages[1].content.filter(isThinking)).toEqual(blocks);
  });

  it("does not fabricate a signed thinking block for a tool-only history", async () => {
    const body = await dispatchNativeCombo("claude-opus-5", {
      type: "enabled", budget_tokens: 2048,
    }, []);
    expect(body.messages[1].content.map(b => b.type)).toEqual(["tool_use"]);
  });

  // LP-021: a combo turn served by a non-Claude model comes back with
  // signature "" — Anthropic 400s "Invalid `signature` in `thinking` block".
  it("drops thinking blocks that carry no signature, keeps opaque ones", async () => {
    const blocks = [
      { type: "thinking", thinking: "from kimi", signature: "" },
      { type: "thinking", thinking: "no field" },
      { type: "redacted_thinking", data: "" },
      ...nativeThinking(),
    ];
    const body = await dispatchNativeCombo("claude-opus-5-5(medium)", {
      type: "enabled", budget_tokens: 2048,
    }, blocks);
    expect(body.messages[1].content.filter(isThinking)).toEqual(nativeThinking());
    expect(body.messages[1].content.at(-1).type).toBe("tool_use");
  });

  it("drops a turn left empty, like a stripped foreign server_tool_use", async () => {
    const { normalizeClaudePassthrough } = await import("../../open-sse/translator/formats/claude.js");
    const out = normalizeClaudePassthrough({
      model: "claude-opus-5-5", max_tokens: 1024,
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: [{ type: "thinking", thinking: "x", signature: "" }] },
        { role: "user", content: "again" },
      ],
    }, "claude-opus-5-5");
    expect(out.messages.map((m) => m.role)).toEqual(["user", "user"]);
  });

  // LP-022: a kimi-signed (non-empty, foreign) thinking block passes LP-021,
  // and Anthropic answers 400 "Invalid `signature` in `thinking` block".
  describe("retry without thinking on an invalid signature", () => {
    const signatureError = () => new Response(JSON.stringify({
      type: "error",
      error: { type: "invalid_request_error", message: "messages.1.content.0: Invalid `signature` in `thinking` block" },
    }), { status: 400, headers: { "content-type": "application/json" } });
    const ok = () => ({
      response: new Response("{}", { headers: { "content-type": "application/json" } }),
      url: "https://api.anthropic.com/v1/messages", headers: {}, transformedBody: null,
    });

    async function send(firstResponse, { toolLoop = false } = {}) {
      executeMock.mockReset();
      executeMock
        .mockResolvedValueOnce({ ...ok(), response: firstResponse })
        .mockResolvedValueOnce(ok());
      const assistant = [
        { type: "thinking", thinking: "kimi reasoning", signature: "kimi-own-signature-fixture" },
        toolLoop
          ? { type: "tool_use", id: "toolu_fixture", name: "Read", input: {} }
          : { type: "text", text: "391" },
      ];
      const request = {
        model: "claude-opus-5-5", stream: false, max_tokens: 4096,
        thinking: { type: "enabled", budget_tokens: 2048 },
        context_management: { edits: [{ type: "clear_thinking_20251015" }, { type: "clear_tool_uses_20250919" }] },
        tools: [{ name: "Read", input_schema: { type: "object", properties: {} } }],
        messages: [
          { role: "user", content: "What is 17*23?" },
          { role: "assistant", content: assistant },
          toolLoop
            ? { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_fixture", content: "ok" }] }
            : { role: "user", content: "Add 9." },
        ],
      };
      const log = { debug: vi.fn(), info: vi.fn(), warn: vi.fn() };
      await handleChatCore({
        body: request, modelInfo: { provider: "claude", model: "claude-opus-5-5" },
        credentials: { accessToken: "fixture", providerSpecificData: {} },
        log, connectionId: "fixture", rtkEnabled: false, headroomEnabled: false,
        cavemanEnabled: false, ponytailEnabled: false, pxpipeEnabled: false,
        sourceFormatOverride: "claude",
        clientRawRequest: {
          endpoint: "/v1/messages", body: request,
          headers: { "user-agent": "claude-cli/2.1.278", accept: "application/json" },
        },
      });
      return executeMock.mock.calls.map((call) => call[0].body);
    }

    it("retries once with the thinking blocks removed", async () => {
      const bodies = await send(signatureError());
      expect(bodies).toHaveLength(2);
      expect(bodies[0].messages[1].content.some(isThinking)).toBe(true);
      expect(bodies[1].messages[1].content.some(isThinking)).toBe(false);
      expect(bodies[1].messages[1].content.map((b) => b.type)).toEqual(["text"]);
    });

    it("turns thinking off when the current tool loop lost its thinking", async () => {
      const bodies = await send(signatureError(), { toolLoop: true });
      expect(bodies).toHaveLength(2);
      expect(bodies[1].messages[1].content.map((b) => b.type)).toEqual(["tool_use"]);
      expect(bodies[1]).not.toHaveProperty("thinking");
      expect(bodies[1].context_management?.edits?.map((e) => e.type)).toEqual(["clear_tool_uses_20250919"]);
    });

    it("does not retry other 400s", async () => {
      const other = new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "max_tokens: too large" } }),
        { status: 400, headers: { "content-type": "application/json" } });
      const bodies = await send(other);
      expect(bodies).toHaveLength(1);
    });
  });
});
