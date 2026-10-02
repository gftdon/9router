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
