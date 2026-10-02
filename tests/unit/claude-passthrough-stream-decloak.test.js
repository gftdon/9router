import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {})
}));

const { createPassthroughStreamWithLogger } = await import("../../open-sse/utils/stream.js");
const { CLAUDE_TOOL_SUFFIX } = await import("../../open-sse/config/appConstants.js");

// LP-023: a Claude-format client that is not native Claude Code, streaming from an
// OAuth Claude provider, gets its tools cloaked with CLAUDE_TOOL_SUFFIX. Same-format
// streams go through the passthrough stream, which never called translateResponse(),
// so the suffixed name ("calc_ide") reached the client and was resent as "calc_ide_ide".

const CLOAKED = "calc" + CLAUDE_TOOL_SUFFIX;

function claudeSSE(toolName) {
  const events = [
    ["message_start", { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], usage: { input_tokens: 10, output_tokens: 1 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "toolu_1", name: toolName, input: {} } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: "{\"expr\":\"12*7\"}" } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 20 } }],
    ["message_stop", { type: "message_stop" }]
  ];
  return events.map(([ev, data]) => `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

async function pipe(raw, toolNameMap) {
  const encoder = new TextEncoder();
  const source = new ReadableStream({ start(c) { c.enqueue(encoder.encode(raw)); c.close(); } });
  const out = source.pipeThrough(createPassthroughStreamWithLogger("claude", null, "claude-opus-5-5", null, null, null, null, toolNameMap));
  return new Response(out).text();
}

function toolStartNames(text) {
  return text.split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => { try { return JSON.parse(l.slice(5).trim()); } catch { return null; } })
    .filter((e) => e?.type === "content_block_start" && e.content_block?.type === "tool_use")
    .map((e) => e.content_block.name);
}

describe("Claude passthrough stream decloaks tool names (LP-023)", () => {
  it("restores the original name from toolNameMap", async () => {
    const text = await pipe(claudeSSE(CLOAKED), new Map([[CLOAKED, "calc"]]));
    expect(toolStartNames(text)).toEqual(["calc"]);
    expect(text).not.toContain(CLOAKED);
    expect(text).toContain("input_json_delta");
  });

  it("strips the suffix when the map misses the name but the request was cloaked", async () => {
    const text = await pipe(claudeSSE("other" + CLAUDE_TOOL_SUFFIX), new Map([[CLOAKED, "calc"]]));
    expect(toolStartNames(text)).toEqual(["other"]);
  });

  it("leaves names untouched without a map (native Claude Code passthrough is not cloaked)", async () => {
    const name = "my_ide"; // a real client tool that happens to end with the suffix
    const text = await pipe(claudeSSE(name), null);
    expect(toolStartNames(text)).toEqual([name]);
  });
});
