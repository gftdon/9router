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
});
