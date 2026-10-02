import { DefaultExecutor } from "./default.js";

// Muse (Meta Model API). Every model is pinned to /v1/responses, which rejects
// the Chat-style top-level `reasoning_effort` with HTTP 400 "unknown parameter"
// — the effort has to travel as `reasoning.effort`. Same normalization the
// opencode-go / opencode-zen executors already apply to Muse Spark.
export class MuseExecutor extends DefaultExecutor {
  constructor() {
    super("muse");
  }

  transformRequest(model, body, stream, credentials) {
    const out = super.transformRequest(model, body, stream, credentials);
    if (!out || typeof out !== "object" || !Array.isArray(out.input)) return out;
    if (out.reasoning_effort !== undefined && out.reasoning === undefined) {
      out.reasoning = { effort: out.reasoning_effort, summary: "auto" };
    }
    if (out.reasoning && typeof out.reasoning === "object" && !Array.isArray(out.reasoning)) {
      if (!out.reasoning.summary) out.reasoning.summary = "auto";
    }
    delete out.reasoning_effort;
    return out;
  }
}
