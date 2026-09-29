import { describe, expect, it } from "vitest";
import { capSchemaDepth, MUSE_SPARK_MAX_SCHEMA_DEPTH } from "../../open-sse/utils/museSparkToolSchema.js";
import { OpenCodeGoExecutor } from "../../open-sse/executors/opencode-go.js";

// Upstream counting (measured live): each node with `properties`/`items` is one
// level, root included; combinators and additionalProperties are transparent.
function depthOf(node, level = 0) {
  if (Array.isArray(node)) return Math.max(level, ...node.map((n) => depthOf(n, level)));
  if (!node || typeof node !== "object") return level;
  const here = ("properties" in node || "items" in node || "prefixItems" in node) ? level + 1 : level;
  let max = here;
  for (const [k, v] of Object.entries(node)) {
    if (k === "properties" && v && typeof v === "object") {
      for (const sub of Object.values(v)) max = Math.max(max, depthOf(sub, here));
    } else if (v && typeof v === "object") max = Math.max(max, depthOf(v, here));
  }
  return max;
}

function nestObjects(n, leaf = { type: "string" }) {
  let s = leaf;
  for (let i = 0; i < n; i++) s = { type: "object", description: `lvl${n - i}`, properties: { a: s }, required: ["a"] };
  return s;
}

function toolsBody(parameters) {
  return {
    model: "x",
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
    tools: [
      { type: "function", name: "deep", description: "d", parameters },
      { type: "function", name: "shallow", description: "s", parameters: nestObjects(2) },
    ],
  };
}

describe("capSchemaDepth", () => {
  it("returns the same reference when within the limit", () => {
    const ok = nestObjects(MUSE_SPARK_MAX_SCHEMA_DEPTH);
    expect(capSchemaDepth(ok)).toBe(ok);
  });

  it("collapses nodes past the limit into typed leaves", () => {
    const deep = nestObjects(14);
    const out = capSchemaDepth(deep);
    expect(out).not.toBe(deep);
    expect(depthOf(out)).toBe(MUSE_SPARK_MAX_SCHEMA_DEPTH);
    let node = out;
    for (let i = 0; i < MUSE_SPARK_MAX_SCHEMA_DEPTH; i++) node = node.properties.a;
    expect(node.type).toBe("object");
    expect(node.properties).toBeUndefined();
    expect(node.description).toMatch(/depth limit/);
    expect(depthOf(deep)).toBe(14); // input not mutated
  });

  it("counts arrays as levels and treats anyOf as transparent", () => {
    let s = { type: "string" };
    for (let i = 0; i < 12; i++) s = { anyOf: [{ type: "array", items: s }, { type: "null" }] };
    const out = capSchemaDepth({ type: "object", properties: { a: s } });
    expect(depthOf(out)).toBe(MUSE_SPARK_MAX_SCHEMA_DEPTH);
  });

  it("inlines local $refs and drops $defs when rewriting", () => {
    const $defs = {};
    for (let i = 0; i < 12; i++) {
      $defs[`d${i}`] = { type: "object", properties: { a: i === 11 ? { type: "string" } : { $ref: `#/$defs/d${i + 1}` } } };
    }
    const out = capSchemaDepth({ type: "object", properties: { root: { $ref: "#/$defs/d0" } }, $defs });
    expect(out.$defs).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain("$ref");
    expect(depthOf(out)).toBe(MUSE_SPARK_MAX_SCHEMA_DEPTH);
  });

  it("terminates on recursive $refs", () => {
    const schema = {
      type: "object",
      properties: { node: { $ref: "#/$defs/n" } },
      $defs: { n: { type: "object", properties: { child: { $ref: "#/$defs/n" } } } },
    };
    const out = capSchemaDepth(schema);
    expect(JSON.stringify(out)).not.toContain("$ref");
    expect(depthOf(out)).toBeLessThanOrEqual(MUSE_SPARK_MAX_SCHEMA_DEPTH);
  });

  it("preserves property names that look like keywords", () => {
    const out = capSchemaDepth(nestObjects(12, { type: "object", properties: { items: { type: "string" } } }));
    expect(depthOf(out)).toBe(MUSE_SPARK_MAX_SCHEMA_DEPTH);
  });
});

describe("OpenCode Go executor wiring", () => {
  it("caps tool schema depth for Muse Spark", () => {
    const exec = new OpenCodeGoExecutor();
    const shallow = nestObjects(2);
    const body = toolsBody(nestObjects(13));
    body.tools[1].parameters = shallow;
    const out = exec.transformRequest("muse-spark-1.3-contributor(max)", body, true, {});
    expect(depthOf(out.tools[0].parameters)).toBe(MUSE_SPARK_MAX_SCHEMA_DEPTH);
    expect(out.tools[1].parameters).toBe(shallow);
  });

  it("leaves other Responses models untouched", () => {
    const exec = new OpenCodeGoExecutor();
    const out = exec.transformRequest("grok-4.7", toolsBody(nestObjects(13)), true, {});
    expect(depthOf(out.tools[0].parameters)).toBe(13);
  });
});
