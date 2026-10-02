import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {})
}));

await import("../translator/registerAll.js");
const { FORMATS } = await import("../../open-sse/translator/formats.js");
const { translateResponse, initState } = await import("../../open-sse/translator/index.js");
const { cleanJSONSchemaForAntigravity } = await import("../../open-sse/translator/formats/gemini.js");
const { translateNonStreamingResponse } = await import("../../open-sse/handlers/chatCore/nonStreamingHandler.js");
const { buildClientToolSchemas, stripSchemaPlaceholder } = await import("../../open-sse/translator/concerns/schemaPlaceholder.js");

// LP-026 (was Bug A): the Antigravity schema cleaner filled empty object schemas
// with a *required* "reason" property; Gemini then sent {"reason": "..."} and
// Claude Code rejected TaskList with "An unexpected parameter `reason` was provided".

const CLIENT_TOOLS = [
  { name: "TaskList", description: "List tasks", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "Note", description: "Has a real reason", input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } },
  { name: "Run", description: "Nested empty object", input_schema: { type: "object", properties: { cmd: { type: "string" }, opts: { type: "object" } }, required: ["cmd"] } }
];

function agFunctionCalls(calls) {
  return {
    response: {
      candidates: [{ content: { role: "model", parts: calls.map(([name, args]) => ({ functionCall: { name, args } })) }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3, totalTokenCount: 13 },
      modelVersion: "gemini-3.8-flash",
      responseId: "r1"
    }
  };
}

describe("Gemini schema placeholder (LP-026)", () => {
  it("keeps the placeholder property but no longer requires it", () => {
    const cleaned = cleanJSONSchemaForAntigravity({ type: "object", properties: {} });
    expect(Object.keys(cleaned.properties)).toEqual(["reason"]);
    expect(cleaned.required).toBeUndefined();
    const nested = cleanJSONSchemaForAntigravity({ type: "object", properties: { opts: { type: "object" } } });
    expect(nested.properties.opts.properties.reason).toBeDefined();
    expect(nested.properties.opts.required).toBeUndefined();
  });

  it("strips the placeholder only where the client schema had no properties", () => {
    const schemas = buildClientToolSchemas(CLIENT_TOOLS);
    expect(stripSchemaPlaceholder({ reason: "x" }, schemas.get("TaskList"))).toEqual({});
    const real = { reason: "keep me" };
    expect(stripSchemaPlaceholder(real, schemas.get("Note"))).toBe(real);
    expect(stripSchemaPlaceholder({ cmd: "ls", opts: { reason: "x" } }, schemas.get("Run"))).toEqual({ cmd: "ls", opts: {} });
  });

  it("non-stream: Claude client gets tool_use input without the placeholder", () => {
    const out = translateNonStreamingResponse(
      agFunctionCalls([["TaskList", { reason: "listing" }], ["Note", { reason: "real" }]]),
      FORMATS.ANTIGRAVITY, FORMATS.CLAUDE, null, buildClientToolSchemas(CLIENT_TOOLS));
    const uses = out.content.filter((b) => b.type === "tool_use");
    expect(uses.map((u) => [u.name, u.input])).toEqual([["TaskList", {}], ["Note", { reason: "real" }]]);
  });

  it("stream: Claude client gets input_json without the placeholder", () => {
    const state = { ...initState(FORMATS.CLAUDE), clientToolSchemas: buildClientToolSchemas(CLIENT_TOOLS), targetFormat: FORMATS.ANTIGRAVITY };
    const events = translateResponse(FORMATS.ANTIGRAVITY, FORMATS.CLAUDE, agFunctionCalls([["TaskList", { reason: "listing" }]]), state);
    const json = events
      .filter((e) => e?.type === "content_block_delta" && e.delta?.type === "input_json_delta")
      .map((e) => e.delta.partial_json).join("");
    expect(JSON.parse(json)).toEqual({});
    expect(events.some((e) => e?.type === "content_block_start" && e.content_block?.name === "TaskList")).toBe(true);
  });

  it("leaves arguments alone when the client tool is unknown", () => {
    const out = translateNonStreamingResponse(agFunctionCalls([["Other", { reason: "x" }]]), FORMATS.ANTIGRAVITY, FORMATS.CLAUDE, null, buildClientToolSchemas(CLIENT_TOOLS));
    expect(out.content.find((b) => b.type === "tool_use").input).toEqual({ reason: "x" });
  });
});
