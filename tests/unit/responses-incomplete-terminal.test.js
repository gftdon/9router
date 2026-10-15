/**
 * LP-041: a Responses upstream that runs out of max_output_tokens ends the stream
 * with `response.incomplete` (incomplete_details.reason = "max_output_tokens"),
 * not `response.completed`. Muse Spark does this when reasoning eats the whole
 * budget (seen live 7/30 at max_tokens 400). 9Router did not know the event:
 * non-stream clients got HTTP 200 with empty content and
 * finish_reason "in_progress", and the usage was never recorded.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, saveRequestUsage } = vi.hoisted(() => ({ fetchMock: vi.fn(), saveRequestUsage: vi.fn(async () => {}) }));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({ default: vi.fn(), proxyAwareFetch: fetchMock }));
vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage,
}));

const MODEL = "muse-spark-1.3-contributor";

// Event sequence and shapes from a real api.meta.ai stream (2026-10-15), with
// neutral ids: reasoning starts, the budget runs out, no message is produced.
const base = {
  id: "resp_incomplete_1", object: "response", created_at: 1792034037, model: MODEL,
  max_output_tokens: 400, output: [], error: null, store: false,
};
const usage = { input_tokens: 13, input_tokens_details: { cached_tokens: 0 }, output_tokens: 400, output_tokens_details: { reasoning_tokens: 400 }, total_tokens: 413 };
const INCOMPLETE_SSE = [
  ["response.created", { type: "response.created", sequence_number: 0, response: { ...base, status: "in_progress", incomplete_details: null } }],
  ["response.in_progress", { type: "response.in_progress", sequence_number: 1, response: { ...base, status: "in_progress", incomplete_details: null } }],
  ["response.output_item.added", { type: "response.output_item.added", sequence_number: 2, output_index: 0, item: { id: "rs_1", type: "reasoning", status: "in_progress", summary: [] } }],
  ["response.incomplete", { type: "response.incomplete", sequence_number: 3, response: { ...base, status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, usage } }],
  ["response.subscription_usage", { type: "response.subscription_usage", subscription: { tier: "tier", weekly: { used_percent: 0 } } }],
].map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}`).join("\n\n") + "\n\ndata: [DONE]\n\n";

const claudeBody = (stream) => ({ model: MODEL, max_tokens: 400, stream, messages: [{ role: "user", content: "Reply with exactly: PONG" }] });
const openaiBody = (stream) => ({ model: MODEL, max_tokens: 400, stream, messages: [{ role: "user", content: "Reply with exactly: PONG" }] });
const responsesBody = (stream) => ({ model: MODEL, max_output_tokens: 400, stream, input: "Reply with exactly: PONG" });

async function run(endpoint, body, sse = INCOMPLETE_SSE) {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } }));
  saveRequestUsage.mockClear();
  const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");
  const result = await handleChatCore({
    body: structuredClone(body),
    modelInfo: { provider: "muse", model: MODEL },
    credentials: { accessToken: "test-token", providerSpecificData: {} },
    clientRawRequest: { endpoint, body, headers: {} },
    sourceFormatOverride: endpoint === "/v1/messages" ? "claude" : undefined,
    connectionId: "test-connection",
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  expect(result.success).toBe(true);
  return { result, text: await result.response.text() };
}

const sseData = (text) => text.split("\n").filter((l) => l.startsWith("data: ") && !l.includes("[DONE]")).map((l) => JSON.parse(l.slice(6)));

describe("Responses upstream ending in response.incomplete (LP-041)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gives an OpenAI non-stream client finish_reason length with usage", async () => {
    const json = JSON.parse((await run("/v1/chat/completions", openaiBody(false))).text);
    expect(json.object).toBe("chat.completion");
    expect(json.choices[0].finish_reason).toBe("length");
    expect(json.usage).toMatchObject({ prompt_tokens: 13, completion_tokens: 400 });
  });

  it("gives a Claude non-stream client stop_reason max_tokens with usage", async () => {
    const json = JSON.parse((await run("/v1/messages", claudeBody(false))).text);
    expect(json.type).toBe("message");
    expect(json.stop_reason).toBe("max_tokens");
    expect(json.usage).toMatchObject({ input_tokens: 13, output_tokens: 400 });
  });

  it("gives a Responses non-stream client the incomplete response", async () => {
    const json = JSON.parse((await run("/v1/responses", responsesBody(false))).text);
    expect(json.status).toBe("incomplete");
    expect(json.incomplete_details).toEqual({ reason: "max_output_tokens" });
  });

  it("ends an OpenAI stream with finish_reason length", async () => {
    const chunks = sseData((await run("/v1/chat/completions", openaiBody(true))).text);
    expect(chunks.map((c) => c.choices?.[0]?.finish_reason).filter(Boolean)).toEqual(["length"]);
  });

  it("ends a Claude stream with stop_reason max_tokens", async () => {
    const events = sseData((await run("/v1/messages", claudeBody(true))).text);
    expect(events.find((e) => e.type === "message_delta")?.delta?.stop_reason).toBe("max_tokens");
    expect(events.at(-1).type).toBe("message_stop");
  });

  it("passes response.incomplete through to a Responses stream without a synthetic failure", async () => {
    const events = sseData((await run("/v1/responses", responsesBody(true))).text);
    expect(events.map((e) => e.type)).toContain("response.incomplete");
    expect(events.map((e) => e.type)).not.toContain("response.failed");
  });

  it("treats response.incomplete as terminal when the upstream sends no [DONE]", async () => {
    const withoutDone = INCOMPLETE_SSE.replace("data: [DONE]\n\n", "");
    const events = sseData((await run("/v1/responses", responsesBody(true), withoutDone)).text);
    expect(events.map((e) => e.type)).not.toContain("response.failed");
  });

  it.each([
    ["OpenAI", "/v1/chat/completions", openaiBody],
    ["Claude", "/v1/messages", claudeBody],
    ["Responses", "/v1/responses", responsesBody],
  ])("records the usage of an incomplete %s stream", async (_label, endpoint, makeBody) => {
    await run(endpoint, makeBody(true));
    await vi.waitFor(() => expect(saveRequestUsage).toHaveBeenCalled());
    expect(saveRequestUsage.mock.calls.at(-1)[0].tokens).toMatchObject({ prompt_tokens: 13, completion_tokens: 400 });
  });

  it("records the usage of an incomplete response", async () => {
    await run("/v1/chat/completions", openaiBody(false));
    await vi.waitFor(() => expect(saveRequestUsage).toHaveBeenCalled());
    expect(saveRequestUsage.mock.calls.at(-1)[0].tokens).toMatchObject({ prompt_tokens: 13, completion_tokens: 400 });
  });
});
