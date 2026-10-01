import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {})
}));

const { FORMATS } = await import("../../open-sse/translator/formats.js");
const { handleForcedSSEToJson } = await import("../../open-sse/handlers/chatCore/sseToJsonHandler.js");

// LP-016: a Claude-format client (/v1/messages, stream:false) behind a provider
// that forces streaming must get an Anthropic `message` body, not chat.completion.
// Upstream issues decolua/9router#3682, #3199, #3462.

function sseResponse(raw) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode(raw)); controller.close(); }
  }), { headers: { "content-type": "text/event-stream" } });
}

function responsesSSE(items, usage = { input_tokens: 12, output_tokens: 3, total_tokens: 15 }) {
  const events = [
    `event: response.created\ndata: ${JSON.stringify({ response: { id: "resp_1", created_at: 1700000000 } })}`,
    ...items.map((item, i) => `event: response.output_item.done\ndata: ${JSON.stringify({ output_index: i, item })}`),
    `event: response.completed\ndata: ${JSON.stringify({ response: { usage } })}`,
    ""
  ];
  return events.join("\n\n");
}

function ctx({ raw, sourceFormat = FORMATS.CLAUDE, targetFormat = FORMATS.OPENAI_RESPONSES, provider = "grok-cli" }) {
  return {
    providerResponse: sseResponse(raw),
    sourceFormat,
    targetFormat,
    provider,
    model: "grok-4.7",
    body: { model: "grok-4.7", messages: [] },
    stream: false,
    requestStartTime: Date.now(),
    connectionId: "test-connection",
    clientRawRequest: { endpoint: "/v1/messages" },
    trackDone: vi.fn(),
    appendLog: vi.fn()
  };
}

describe("forced-SSE JSON path for a Claude client behind a Responses upstream", () => {
  it("returns an Anthropic message body with a text block", async () => {
    const raw = responsesSSE([
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "OK" }] }
    ]);
    const result = await handleForcedSSEToJson(ctx({ raw }));
    expect(result.success).toBe(true);
    const json = await result.response.json();
    expect(json.type).toBe("message");
    expect(json.role).toBe("assistant");
    expect(json).not.toHaveProperty("choices");
    expect(json.content).toEqual([{ type: "text", text: "OK" }]);
    expect(json.stop_reason).toBe("end_turn");
    expect(json.usage).toMatchObject({ input_tokens: 12, output_tokens: 3 });
  });

  it("maps Responses function_call items to tool_use blocks", async () => {
    const raw = responsesSSE([
      { type: "function_call", call_id: "call_7", name: "Bash", arguments: "{\"command\":\"ls\"}" }
    ]);
    const result = await handleForcedSSEToJson(ctx({ raw }));
    const json = await result.response.json();
    expect(json.type).toBe("message");
    expect(json.stop_reason).toBe("tool_use");
    expect(json.content).toEqual([
      { type: "tool_use", id: "call_7", name: "Bash", input: { command: "ls" } }
    ]);
  });

  it("still returns chat.completion for an OpenAI client", async () => {
    const raw = responsesSSE([
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "OK" }] }
    ]);
    const result = await handleForcedSSEToJson(ctx({ raw, sourceFormat: FORMATS.OPENAI }));
    const json = await result.response.json();
    expect(json.object).toBe("chat.completion");
    expect(json.choices[0].message.content).toBe("OK");
  });
});

describe("forced-SSE JSON path for a Claude client behind a chat upstream", () => {
  const chatRaw = [
    'data: {"id":"chatcmpl-sse","object":"chat.completion.chunk","created":1700000000,"model":"gpt-x","choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_9","type":"function","function":{"name":"shell","arguments":""}}]},"finish_reason":null}]}',
    'data: {"id":"chatcmpl-sse","object":"chat.completion.chunk","created":1700000000,"model":"gpt-x","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"cmd\\":\\"pwd\\"}"}}]},"finish_reason":null}]}',
    'data: {"id":"chatcmpl-sse","object":"chat.completion.chunk","created":1700000000,"model":"gpt-x","choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
    "data: [DONE]",
    ""
  ].join("\n\n");

  it("returns an Anthropic message body with a tool_use block", async () => {
    const result = await handleForcedSSEToJson(ctx({ raw: chatRaw, targetFormat: FORMATS.OPENAI, provider: "op-test-chat" }));
    expect(result.success).toBe(true);
    const json = await result.response.json();
    expect(json.type).toBe("message");
    expect(json).not.toHaveProperty("choices");
    expect(json.stop_reason).toBe("tool_use");
    expect(json.content).toEqual([
      { type: "tool_use", id: "call_9", name: "shell", input: { cmd: "pwd" } }
    ]);
  });
});
