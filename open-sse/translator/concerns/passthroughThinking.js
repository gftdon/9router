// Combo thinking suffix "model(level)" for native passthrough requests (LP-037).
// Passthrough skips translateRequest, so applyThinking never ran and the suffix
// was only stripped from the model id: a Claude Code request to cc/claude-opus-5-5(high)
// went upstream with whatever thinking the client sent (budget 32k, no effort).

import { getCapabilitiesForModel } from "../../providers/capabilities.js";
import { DEFAULT_MAX_TOKENS } from "../../config/runtimeConfig.js";
import { FORMATS } from "../formats.js";
import { applyThinking, parseSuffix, resolveFormat } from "./thinkingUnified.js";

// Thinking formats each passthrough wire can carry. A format outside the set
// (e.g. claude-adaptive for a Claude model on the antigravity Gemini envelope)
// is skipped rather than written into a body shape the upstream won't read.
const WIRE_FORMATS = {
  [FORMATS.CLAUDE]: new Set(["claude-adaptive", "claude-budget"]),
  [FORMATS.GEMINI_CLI]: new Set(["gemini-level", "gemini-budget"]),
  [FORMATS.ANTIGRAVITY]: new Set(["gemini-level", "gemini-budget"]),
};

/**
 * Apply the model-name thinking suffix to a passthrough body in place.
 * No suffix → body untouched (passthrough stays lossless). Codex has its own
 * handling in chatCore and is not covered here.
 * @returns {string|null} the applied thinking format, or null when nothing changed
 */
export function applyPassthroughSuffixThinking(wireFormat, model, body, provider) {
  if (!body || typeof body !== "object") return null;
  const { cleanModel, override } = parseSuffix(model);
  if (!override) return null;
  const allowed = WIRE_FORMATS[wireFormat];
  if (!allowed) return null;
  const fmt = resolveFormat(wireFormat, cleanModel, provider);
  if (!allowed.has(fmt)) return null;

  // passthrough bodies are shallow copies of the client body: copy the nested
  // objects applyThinking mutates so a combo fallback still sees the original.
  if (body.request && typeof body.request === "object") {
    body.request = { ...body.request };
    if (body.request.generationConfig) body.request.generationConfig = { ...body.request.generationConfig };
  }
  if (body.generationConfig) body.generationConfig = { ...body.generationConfig };

  // applyThinking drops output_config wholesale; keep the client's other fields (e.g. format).
  const oc = body.output_config && typeof body.output_config === "object" ? { ...body.output_config } : null;
  if (oc) delete oc.effort;

  applyThinking(wireFormat, model, body, provider, override);

  if (oc && Object.keys(oc).length) body.output_config = { ...oc, ...(body.output_config || {}) };

  // Anthropic needs max_tokens > budget_tokens (same reconcile prepareClaudeRequest
  // runs on the translated path, which passthrough never reaches).
  const t = body.thinking;
  if (wireFormat === FORMATS.CLAUDE && t?.type === "enabled" && t.budget_tokens && body.max_tokens && t.budget_tokens >= body.max_tokens) {
    const ceiling = getCapabilitiesForModel(provider, cleanModel).maxOutput || DEFAULT_MAX_TOKENS;
    body.max_tokens = Math.min(t.budget_tokens + 1024, ceiling);
    if (t.budget_tokens >= body.max_tokens) t.budget_tokens = Math.max(1024, body.max_tokens - 1024);
  }
  return fmt;
}
