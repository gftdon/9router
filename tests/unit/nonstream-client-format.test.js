import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {})
}));

const { FORMATS } = await import("../../open-sse/translator/formats.js");
const { translateNonStreamingResponse, handleNonStreamingResponse } = await import("../../open-sse/handlers/chatCore/nonStreamingHandler.js");

// LP-024 (was Bug D): a non-stream /v1/messages (or /v1/responses) request
// served by Gemini/Antigravity, Claude or Ollama got the intermediate OpenAI
// chat.completion instead of a body in the client's own format.

function agBody(parts, finishReason = "STOP") {
  return {
    response: {
      candidates: [{ content: { role: "model", parts }, finishReason }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5, totalTokenCount: 17 },
      modelVersion: "gemini-3.8-flash",
      responseId: "abc123"
    }
  };
}

describe("non-stream response reaches the client format (LP-024)", () => {
  it("antigravity text → Anthropic message for a Claude client", () => {
    const out = translateNonStreamingResponse(agBody([{ text: "OK" }]), FORMATS.ANTIGRAVITY, FORMATS.CLAUDE);
    expect(out.type).toBe("message");
    expect(out.object).toBeUndefined();
    expect(out.content).toEqual([{ type: "text", text: "OK" }]);
    expect(out.stop_reason).toBe("end_turn");
    expect(out.usage).toMatchObject({ input_tokens: 12, output_tokens: 5 });
  });

  it("antigravity functionCall → tool_use with stop_reason tool_use", () => {
    const out = translateNonStreamingResponse(
      agBody([{ thought: true, text: "plan" }, { functionCall: { name: "calc", args: { expr: "12*7" } } }]),
      FORMATS.ANTIGRAVITY, FORMATS.CLAUDE);
    expect(out.content.map((b) => b.type)).toEqual(["thinking", "tool_use"]);
    expect(out.content[1]).toMatchObject({ name: "calc", input: { expr: "12*7" } });
    expect(out.stop_reason).toBe("tool_use");
  });

  it("gemini → Responses body for a Responses client", () => {
    const out = translateNonStreamingResponse(agBody([{ text: "hi" }]), FORMATS.GEMINI, FORMATS.OPENAI_RESPONSES);
    expect(out.object).toBe("response");
    expect(out.choices).toBeUndefined();
  });

  it("ollama → Anthropic message for a Claude client", () => {
    const ollama = { model: "llama", message: { role: "assistant", content: "yo" }, done: true, done_reason: "stop", prompt_eval_count: 3, eval_count: 2 };
    const out = translateNonStreamingResponse(ollama, FORMATS.OLLAMA, FORMATS.CLAUDE);
    expect(out.type).toBe("message");
    expect(out.content[0]).toMatchObject({ type: "text", text: "yo" });
  });

  it("OpenAI clients still get chat.completion", () => {
    const out = translateNonStreamingResponse(agBody([{ text: "OK" }]), FORMATS.ANTIGRAVITY, FORMATS.OPENAI);
    expect(out.object).toBe("chat.completion");
    expect(out.choices[0].message.content).toBe("OK");
  });

  it("handleNonStreamingResponse returns a Claude body with usage to a Claude client", async () => {
    const providerResponse = new Response(JSON.stringify(agBody([{ text: "OK" }])), { headers: { "content-type": "application/json" } });
    const result = await handleNonStreamingResponse({
      providerResponse, provider: "antigravity", model: "gemini-3.8-flash",
      sourceFormat: FORMATS.CLAUDE, targetFormat: FORMATS.ANTIGRAVITY,
      body: { model: "gemini-3.8-flash", messages: [] }, stream: false, translatedBody: {}, finalBody: {},
      requestStartTime: Date.now(), connectionId: null, apiKey: null, clientRawRequest: {},
      reqLogger: { logProviderResponse() {}, logConvertedResponse() {} },
      toolNameMap: null, customToolNames: null, trackDone() {}, appendLog() {}
    });
    const json = await result.response.json();
    expect(json.type).toBe("message");
    expect(json.content[0]).toEqual({ type: "text", text: "OK" });
    expect(json.usage.input_tokens).toBeGreaterThan(0);
    expect(json.usage.output_tokens).toBeGreaterThan(0);
  });
});
