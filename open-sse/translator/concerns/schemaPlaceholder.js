// LP-026: Gemini/Antigravity/Vertex reject object schemas with no properties, so
// cleanJSONSchemaForAntigravity fills them with a placeholder property. The model
// then sends that property back, and strict clients (Claude Code's TaskList,
// EnterPlanMode, ...) reject the call: "An unexpected parameter `reason` was provided".
// The placeholder stays optional, and it is stripped from tool-call arguments
// wherever the client's own schema never declared it.

export const SCHEMA_PLACEHOLDER_KEY = "reason";

export function schemaPlaceholderProperties(description = "Brief explanation of why you are calling this tool") {
  return { [SCHEMA_PLACEHOLDER_KEY]: { type: "string", description } };
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// name → JSON schema of every tool the client declared (Claude, OpenAI Chat, Responses shapes)
export function buildClientToolSchemas(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return null;
  const map = new Map();
  for (const tool of tools) {
    if (!isPlainObject(tool)) continue;
    const fn = isPlainObject(tool.function) ? tool.function : null;
    const name = typeof tool.name === "string" ? tool.name : fn?.name;
    const schema = tool.input_schema || tool.parameters || fn?.parameters;
    if (typeof name === "string" && name) map.set(name, isPlainObject(schema) ? schema : {});
  }
  return map.size > 0 ? map : null;
}

// Remove the placeholder from `args` wherever `schema` has no properties of its own
// (exactly where the cleaner added it). Returns the same object when nothing changed.
export function stripSchemaPlaceholder(args, schema) {
  if (!isPlainObject(schema)) return args;
  if (Array.isArray(args)) {
    if (!isPlainObject(schema.items)) return args;
    let changed = false;
    const out = args.map((item) => {
      const next = stripSchemaPlaceholder(item, schema.items);
      if (next !== item) changed = true;
      return next;
    });
    return changed ? out : args;
  }
  if (!isPlainObject(args)) return args;

  const props = isPlainObject(schema.properties) ? schema.properties : null;
  if (!props || Object.keys(props).length === 0) {
    if (!Object.prototype.hasOwnProperty.call(args, SCHEMA_PLACEHOLDER_KEY)) return args;
    const { [SCHEMA_PLACEHOLDER_KEY]: _placeholder, ...rest } = args;
    return rest;
  }

  let out = args;
  for (const [key, value] of Object.entries(args)) {
    if (!isPlainObject(props[key])) continue;
    const next = stripSchemaPlaceholder(value, props[key]);
    if (next !== value) {
      if (out === args) out = { ...args };
      out[key] = next;
    }
  }
  return out;
}

export function stripToolCallPlaceholder(name, args, clientToolSchemas) {
  const schema = clientToolSchemas?.get?.(name);
  return schema ? stripSchemaPlaceholder(args, schema) : args;
}
