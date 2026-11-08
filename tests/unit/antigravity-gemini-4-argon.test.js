import { describe, expect, it } from "vitest";

import { getModelUpstreamId } from "../../open-sse/config/providerModels.js";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";
import { getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";
import { MODEL_PRICING } from "../../open-sse/providers/pricing.js";
import antigravity from "../../open-sse/providers/registry/antigravity.js";
import * as shared from "../../open-sse/providers/shared.js";
import { applyThinking, stripThinkingSuffix } from "../../open-sse/translator/concerns/thinkingUnified.js";

// LP-040: Antigravity served Gemini 4 Argon only to the agy CLI identity while
// 9Router sent the IDE User-Agent (404 "Requested entity was not found."). Upstream
// f172c3c4 switched to the Hub User-Agent, which Google serves Argon to (probed
// 2026-11-08), so the CLI override is gone; Argon must ride the shared Hub UA.
const CREDENTIALS = { accessToken: "token", projectId: "project", connectionId: "connection" };

function wireRequest(publicModel) {
  const upstreamModel = getModelUpstreamId("ag", publicModel);
  const body = {
    model: stripThinkingSuffix(upstreamModel),
    request: { contents: [{ role: "user", parts: [{ text: "hello" }] }], generationConfig: {} },
  };
  applyThinking("antigravity", upstreamModel, body, "antigravity");
  const executor = new AntigravityExecutor();
  const finalBody = executor.transformRequest(publicModel, body, true, CREDENTIALS);
  const headers = executor.buildHeaders(CREDENTIALS, true, "https://example.test", publicModel, finalBody);
  return { upstreamModel, finalBody, headers };
}

describe("Gemini 4 Argon on Antigravity (LP-040)", () => {
  it("registers the three Argon tiers plus a bare alias", () => {
    const ids = antigravity.models.map((m) => m.id);
    for (const id of ["gemini-4-argon-high", "gemini-4-argon-medium", "gemini-4-argon-low", "gemini-4-argon"]) {
      expect(ids).toContain(id);
    }
  });

  it.each(["high", "medium", "low"])("sends the %s tier with the matching thinking level", (tier) => {
    const { upstreamModel, finalBody } = wireRequest(`gemini-4-argon-${tier}`);
    expect(upstreamModel).toBe(`gemini-4-argon-${tier}(${tier})`);
    expect(finalBody.model).toBe(`gemini-4-argon-${tier}`);
    expect(finalBody.request.generationConfig.thinkingConfig).toEqual({ thinkingLevel: tier, includeThoughts: true });
  });

  it("maps the bare alias to the medium tier like gemini-3.8-flash", () => {
    expect(wireRequest("gemini-4-argon").finalBody.model).toBe("gemini-4-argon-medium");
  });

  it("resolves Antigravity's published limits", () => {
    expect(getCapabilitiesForModel("antigravity", "gemini-4-argon-high")).toMatchObject({
      vision: true,
      reasoning: true,
      thinkingFormat: "gemini-level",
      thinkingCanDisable: false,
      contextWindow: 1048576,
      maxOutput: 65536,
    });
  });

  it("prices every Argon id", () => {
    const rate = { input: 2.0, output: 10.0, cached: 0.1, reasoning: 10.0, cache_creation: 2.5 };
    for (const id of ["gemini-4-argon", "gemini-4-argon-high", "gemini-4-argon-medium", "gemini-4-argon-low"]) {
      expect(MODEL_PRICING[id]).toEqual(rate);
    }
  });

  it("sends Argon with the same Hub User-Agent as every other Antigravity model", () => {
    expect(shared.ANTIGRAVITY_IDE_USER_AGENT).toMatch(/^antigravity\/hub\//);
    for (const id of ["gemini-4-argon-high", "gemini-4-argon", "gemini-3.8-flash-high"]) {
      expect(wireRequest(id).headers["User-Agent"]).toBe(shared.ANTIGRAVITY_IDE_USER_AGENT);
    }
    expect(shared.ANTIGRAVITY_CLI_USER_AGENT).toBeUndefined();
  });
});
