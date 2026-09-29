// Muse Spark tool JSON Schema compatibility.
//
// The Muse Spark backend (served through OpenCode Go / Zen / free `/responses`)
// rejects any function tool whose `parameters` nest too deep:
//
//   400 JSON schema exceeds the maximum nesting depth of 10 levels
//   param: parameters
//
// Measured against `muse-spark-1.3-contributor` (2026-09-29): a "level" is a
// schema node carrying `properties` or `items` (the root object counts as one);
// `anyOf`/`oneOf`/`allOf` wrappers and `additionalProperties` are transparent,
// local `$ref`s are resolved before counting, and a bare `{type:"object"}` leaf
// is accepted. One over-deep MCP tool (e.g. Vercel `update_firewall_config`)
// 400s the whole request, so every account fails identically.
//
// Scope guardrail: this is NOT a global schema sanitizer. Callers run it only
// for Muse Spark models, and schemas already within the limit are returned
// byte-identical (same reference). Over-deep schemas get their local `$ref`s
// inlined and every node past the limit collapsed to a typed leaf, so the tool
// stays usable — the model just sees a looser shape for the deepest fields.

export const MUSE_SPARK_MAX_SCHEMA_DEPTH = 10;

const CONTAINER_KEYS = ["properties", "items", "prefixItems"];
// Keys whose value is a map of arbitrary names → schema, never schema keywords.
const SCHEMA_MAP_KEYS = new Set(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]);
// Kept on a collapsed node so the model still knows the field's type and intent.
const LEAF_KEEP_KEYS = ["type", "title", "description", "nullable", "default", "enum", "const"];
const TRUNCATED_NOTE = "(nested fields omitted: schema depth limit)";

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isContainer(node) {
  return isPlainObject(node) && CONTAINER_KEYS.some((k) => k in node);
}

function resolveLocalRef(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;
  let cur = root;
  for (const raw of ref.slice(2).split("/")) {
    const seg = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!cur || typeof cur !== "object" || !(seg in cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

// Deepest container chain below `node`, following local refs. A ref cycle
// counts as unbounded so recursive schemas always take the rewrite path.
function measure(node, root, level, refStack) {
  if (Array.isArray(node)) {
    let max = level;
    for (const item of node) max = Math.max(max, measure(item, root, level, refStack));
    return max;
  }
  if (!isPlainObject(node)) return level;
  const here = isContainer(node) ? level + 1 : level;
  let max = here;
  if (typeof node.$ref === "string") {
    if (refStack.has(node.$ref)) return Infinity;
    const target = resolveLocalRef(root, node.$ref);
    if (target !== undefined) {
      refStack.add(node.$ref);
      max = Math.max(max, measure(target, root, level, refStack));
      refStack.delete(node.$ref);
      if (max === Infinity) return max;
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "$defs" || key === "definitions" || key === "$ref") continue;
    if (SCHEMA_MAP_KEYS.has(key) && isPlainObject(value)) {
      for (const sub of Object.values(value)) max = Math.max(max, measure(sub, root, here, refStack));
    } else if (value && typeof value === "object") {
      max = Math.max(max, measure(value, root, here, refStack));
    }
    if (max === Infinity) return max;
  }
  return max;
}

function collapse(node, stats) {
  stats.truncated++;
  const leaf = {};
  for (const key of LEAF_KEEP_KEYS) if (key in node) leaf[key] = node[key];
  leaf.description = leaf.description ? `${leaf.description} ${TRUNCATED_NOTE}` : TRUNCATED_NOTE;
  return leaf;
}

function rewrite(node, root, level, maxDepth, refStack, stats) {
  if (Array.isArray(node)) return node.map((item) => rewrite(item, root, level, maxDepth, refStack, stats));
  if (!isPlainObject(node)) return node;

  if (typeof node.$ref === "string") {
    const target = resolveLocalRef(root, node.$ref);
    if (target !== undefined) {
      // Recursive ref: stop here with a typed leaf rather than unrolling it.
      if (refStack.has(node.$ref)) return collapse(isPlainObject(target) ? target : {}, stats);
      const { $ref, ...siblings } = node;
      refStack.add($ref);
      const inlined = rewrite(isPlainObject(target) ? { ...target, ...siblings } : siblings, root, level, maxDepth, refStack, stats);
      refStack.delete($ref);
      return inlined;
    }
  }

  const here = isContainer(node) ? level + 1 : level;
  if (here > maxDepth) return collapse(node, stats);

  const next = {};
  for (const [key, value] of Object.entries(node)) {
    // Local refs are inlined above, so the definition tables are dead weight.
    if (key === "$defs" || key === "definitions") continue;
    if (SCHEMA_MAP_KEYS.has(key) && isPlainObject(value)) {
      const map = {};
      for (const [name, sub] of Object.entries(value)) map[name] = rewrite(sub, root, here, maxDepth, refStack, stats);
      next[key] = map;
    } else if (value && typeof value === "object") {
      next[key] = rewrite(value, root, here, maxDepth, refStack, stats);
    } else {
      next[key] = value;
    }
  }
  return next;
}

// Returns the same reference when the schema already fits within `maxDepth`.
export function capSchemaDepth(schema, maxDepth = MUSE_SPARK_MAX_SCHEMA_DEPTH, stats = { truncated: 0 }) {
  if (!isPlainObject(schema)) return schema;
  if (measure(schema, schema, 0, new Set()) <= maxDepth) return schema;
  return rewrite(schema, schema, 0, maxDepth, new Set(), stats);
}

// Apply capSchemaDepth to every function tool (flat Responses or nested Chat shape).
export function capToolSchemasDepth(tools, maxDepth = MUSE_SPARK_MAX_SCHEMA_DEPTH) {
  const stats = { truncated: 0, tools: 0 };
  if (!Array.isArray(tools)) return stats;
  for (const tool of tools) {
    if (!isPlainObject(tool)) continue;
    const holder = isPlainObject(tool.parameters) ? tool : (isPlainObject(tool.function?.parameters) ? tool.function : null);
    if (!holder) continue;
    const before = stats.truncated;
    const capped = capSchemaDepth(holder.parameters, maxDepth, stats);
    if (capped !== holder.parameters) {
      holder.parameters = capped;
      if (stats.truncated > before) stats.tools++;
    }
  }
  return stats;
}
