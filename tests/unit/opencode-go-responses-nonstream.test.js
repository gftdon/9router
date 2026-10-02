import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({ default: vi.fn(), proxyAwareFetch: fetchMock }));
vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
}));

// LP-030: opencode-go pins stream:true for its Responses-only models (muse-spark,
// gpt-6-luna, grok-4.x), so a non-stream client got Responses SSE parsed by the
// chat SSE parser — an empty chat.completion, whatever the client format.

const MODEL = "muse-spark-1.3-contributor";

const responsesSSE = [
  `event: response.created\ndata: ${JSON.stringify({ type: "response.created", response: { id: "resp_o1", created_at: 1700000000, model: MODEL } })}`,
  `event: response.output_item.done\ndata: ${JSON.stringify({ type: "response.output_item.done", output_index: 0, item: { type: "message", role: "assistant", content: [{ type: "output_text", text: "7006652" }] } })}`,
  `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id: "resp_o1", status: "completed", usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 } } })}`,
  "",
].join("\n\n");

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(responsesSSE, { status: 200, headers: { "content-type": "text/event-stream" } }));
});

async function nonStream(endpoint, body) {
  const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");
  const result = await handleChatCore({
    body: structuredClone(body),
    modelInfo: { provider: "opencode-go", model: MODEL },
    credentials: { apiKey: "test-key", providerSpecificData: {} },
    clientRawRequest: { endpoint, body, headers: { accept: "application/json" } },
    sourceFormatOverride: { "/v1/messages": "claude", "/v1/responses": "openai-responses" }[endpoint],
    connectionId: "test-connection",
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  expect(result.success).toBe(true);
  expect(result.response.headers.get("content-type")).toContain("application/json");
  return result.response.json();
}

describe("opencode-go Responses-only models, non-stream clients (LP-030)", () => {
  it("returns a Responses object to a Responses client", async () => {
    const json = await nonStream("/v1/responses", { model: MODEL, input: "1234*5678?", stream: false });
    expect(json.object).toBe("response");
    const text = json.output.find((o) => o.type === "message").content[0].text;
    expect(text).toBe("7006652");
  });

  it("returns an Anthropic message to a Claude client", async () => {
    const json = await nonStream("/v1/messages", { model: MODEL, max_tokens: 100, stream: false, messages: [{ role: "user", content: "1234*5678?" }] });
    expect(json.type).toBe("message");
    expect(json.content.find((b) => b.type === "text").text).toBe("7006652");
  });

  it("returns a filled chat.completion to an OpenAI client", async () => {
    const json = await nonStream("/v1/chat/completions", { model: MODEL, stream: false, messages: [{ role: "user", content: "1234*5678?" }] });
    expect(json.object).toBe("chat.completion");
    expect(json.choices[0].message.content).toBe("7006652");
  });
});
