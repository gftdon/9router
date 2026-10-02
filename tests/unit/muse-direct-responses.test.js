/**
 * Muse (Meta Model API, provider `muse`) pins its models to the Responses wire.
 * Claude Code / OpenAI clients have no matching transport, so the body is
 * translated to Responses — the endpoint has to follow, or Meta answers
 * HTTP 400 "unknown parameter `input`" on /chat/completions. (LP-017)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({ default: vi.fn(), proxyAwareFetch: fetchMock }));
vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
}));

const MODEL = "muse-spark-1.3-contributor";

async function captureWire({ endpoint, body, model = MODEL }) {
  const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");
  await handleChatCore({
    body: structuredClone(body),
    modelInfo: { provider: "muse", model },
    credentials: { accessToken: "test-token", providerSpecificData: {} },
    clientRawRequest: { endpoint, body, headers: {} },
    // /v1/messages pins the source format in the real route; mirror it.
    sourceFormatOverride: endpoint === "/v1/messages" ? "claude" : undefined,
    connectionId: "test-connection",
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  expect(fetchMock).toHaveBeenCalled();
  const [url, options] = fetchMock.mock.calls[0];
  return { url, headers: options.headers, body: JSON.parse(options.body) };
}

const claudeBody = (model = MODEL) => ({
  model,
  max_tokens: 1000,
  stream: true,
  messages: [{ role: "user", content: "Say hi." }],
});
const openaiBody = (model = MODEL) => ({
  model,
  max_tokens: 1000,
  stream: true,
  messages: [{ role: "user", content: "Say hi." }],
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{"error":{"message":"stop"}}', {
    status: 418,
    headers: { "content-type": "application/json" },
  }));
});

describe("muse direct provider wire routing", () => {
  it("sends a Claude client's translated body to /v1/responses", async () => {
    const wire = await captureWire({ endpoint: "/v1/messages", body: claudeBody() });
    expect(wire.url).toBe("https://api.meta.ai/v1/responses");
    expect(wire.body).toHaveProperty("input");
    expect(wire.body).not.toHaveProperty("messages");
    expect(wire.headers["x-api-version"]).toBe("1.0.0");
  });

  it("sends an OpenAI client's translated body to /v1/responses", async () => {
    const wire = await captureWire({ endpoint: "/v1/chat/completions", body: openaiBody() });
    expect(wire.url).toBe("https://api.meta.ai/v1/responses");
    expect(wire.body).toHaveProperty("input");
  });
});

describe("muse direct provider reasoning effort", () => {
  // Meta's /v1/responses: HTTP 400 "unknown parameter `reasoning_effort`". (LP-018)
  it("moves a Claude client's effort into reasoning.effort", async () => {
    const wire = await captureWire({ endpoint: "/v1/messages", body: claudeBody(`${MODEL}(high)`), model: `${MODEL}(high)` });
    expect(wire.body).not.toHaveProperty("reasoning_effort");
    expect(wire.body.reasoning).toMatchObject({ effort: "high", summary: "auto" });
  });

  it("moves an OpenAI client's reasoning_effort into reasoning.effort", async () => {
    const body = { ...openaiBody(), reasoning_effort: "low" };
    const wire = await captureWire({ endpoint: "/v1/chat/completions", body });
    expect(wire.body).not.toHaveProperty("reasoning_effort");
    expect(wire.body.reasoning).toMatchObject({ effort: "low" });
  });
});

describe("muse direct provider tool schema depth", () => {
  // Meta: HTTP 400 "JSON schema exceeds the maximum nesting depth of 10 levels". (LP-013)
  const deep = (n) => (n ? { type: "object", properties: { x: deep(n - 1) } } : { type: "string" });

  it("caps a Claude client's deep tool schema to Meta's nesting limit", async () => {
    const body = {
      ...claudeBody(),
      tools: [{ name: "Deep", description: "deep", input_schema: deep(13) }],
    };
    const wire = await captureWire({ endpoint: "/v1/messages", body });
    const tool = wire.body.tools.find((t) => t.name === "Deep");
    expect(tool).toBeDefined();
    // Same cap LP-013 applies on the opencode path (Meta accepted this shape live).
    const { capSchemaDepth } = await import("../../open-sse/utils/museSparkToolSchema.js");
    expect(tool.parameters).not.toEqual(deep(13));
    expect(tool.parameters).toEqual(capSchemaDepth(structuredClone(deep(13))));
    expect(JSON.stringify(tool.parameters)).toContain("schema depth limit");
  });
});

describe("muse direct provider effort levels", () => {
  // Meta accepts minimal..max and rejects "none"; the openai default capped
  // (max) to xhigh. (LP-019)
  it("publishes Meta's level set for muse-spark", async () => {
    const { getThinkingLevels } = await import("../../open-sse/providers/thinkingLevels.js");
    expect(getThinkingLevels("muse", MODEL)).toEqual(["minimal", "low", "medium", "high", "xhigh", "max"]);
  });

  it("sends (max) as reasoning.effort max", async () => {
    const wire = await captureWire({ endpoint: "/v1/messages", body: claudeBody(`${MODEL}(max)`), model: `${MODEL}(max)` });
    expect(wire.body.reasoning).toMatchObject({ effort: "max" });
  });

  it("leaves opencode-go's muse-spark levels unchanged", async () => {
    const { getThinkingLevels } = await import("../../open-sse/providers/thinkingLevels.js");
    expect(getThinkingLevels("opencode-go", MODEL)).toEqual(["none", "minimal", "low", "medium", "high", "xhigh"]);
  });
});
