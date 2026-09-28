// The router records the client-facing model id in usageHistory, and that id
// keeps the thinking level the executor strips only for the upstream body
// ("gpt-6-astra-medium" → "gpt-6-astra" on the wire). getPricingForModel used to
// miss every suffixed id and return null, which usageRepo.calculateCost turns
// into a silently stored cost of $0 — the whole gpt-6 family billed as free.
//
// These tests pin both halves of the fix: suffixed ids resolve to their base
// model's rate, and the last-resort ordering leaves every id that already
// resolved through an exact key or a glob exactly where it was.

import { describe, it, expect } from "vitest";
import { getPricingForModel } from "open-sse/providers/pricing.js";

const rate = (provider, model) => {
  const p = getPricingForModel(provider, model);
  return p && { input: p.input, output: p.output, cached: p.cached };
};

describe("getPricingForModel — effort-suffix fallback", () => {
  it("prices the gpt-6 family at OpenAI's published rates", () => {
    expect(rate("codex", "gpt-6-astra")).toEqual({ input: 10, output: 50, cached: 1 });
    expect(rate("codex", "gpt-6-sol")).toEqual({ input: 2, output: 10, cached: 0.2 });
    expect(rate("codex", "gpt-6-luna")).toEqual({ input: 0.1, output: 0.5, cached: 0.01 });
  });

  it("resolves every dash level to its own family's rate", () => {
    for (const level of ["low", "medium", "high", "xhigh", "max"]) {
      expect(rate("codex", `gpt-6-astra-${level}`)).toEqual({ input: 10, output: 50, cached: 1 });
      expect(rate("codex", `gpt-6-sol-${level}`)).toEqual({ input: 2, output: 10, cached: 0.2 });
      expect(rate("codex", `gpt-6-luna-${level}`)).toEqual({ input: 0.1, output: 0.5, cached: 0.01 });
    }
  });

  it("resolves the parenthesised level convention too", () => {
    // kimi "k3(max)" recorded ~4.5k requests at $0 for the same reason.
    expect(rate("kimi", "k3(max)")).toEqual(rate("kimi", "k3"));
    expect(rate("kimi", "k3(max)")).not.toBeNull();
  });

  it("keeps gpt-5.6 sol/luna/terra off the generic gpt-5.6-* rate", () => {
    expect(rate("codex", "gpt-5.6-sol-high")).toEqual({ input: 4, output: 20, cached: 0.4 });
    expect(rate("codex", "gpt-5.6-sol-xhigh")).toEqual({ input: 4, output: 20, cached: 0.4 });
    expect(rate("codex", "gpt-5.6-terra-high")).toEqual({ input: 2, output: 12, cached: 0.2 });
    expect(rate("codex", "gpt-5.6-luna-high")).toEqual({ input: 0.2, output: 1.2, cached: 0.02 });
    // the catch-all still serves everything else in the family
    expect(rate("codex", "gpt-5.6-mini")).toEqual({ input: 2.5, output: 15, cached: 0.25 });
  });

  it("does not shadow effort-specific tiers that already matched a pattern", () => {
    // "*-codex-high" must keep winning over the base "gpt-5.1-codex" entry:
    // the fallback runs last precisely so these stay authoritative.
    expect(rate("codex", "gpt-5.1-codex-high")).toEqual({ input: 8, output: 32, cached: 4 });
    expect(rate("codex", "gpt-5.1-codex-max")).toEqual({ input: 8, output: 32, cached: 4 });
    expect(rate("codex", "gpt-5.1-codex-mini-high")).toEqual({ input: 2, output: 8, cached: 1 });
    expect(rate("codex", "gpt-5.1-codex-low")).toEqual({ input: 1.75, output: 14, cached: 0.175 });
  });

  it("leaves already-priced models untouched", () => {
    expect(rate("antigravity", "gemini-3.8-flash-high")).toEqual({ input: 1.5, output: 7.5, cached: 0.15 });
    expect(rate("antigravity", "claude-opus-4-6-thinking")).toEqual({ input: 5, output: 25, cached: 0.5 });
    expect(rate("kimi", "kimi-k3(max)")).toEqual({ input: 3, output: 15, cached: 0.3 });
    expect(rate("glm", "glm-5.3(max)")).toEqual({ input: 1, output: 4, cached: 0.5 });
    // a real id that merely ends in a level word keeps its own glob match
    expect(rate("tokenrouter", "qwen3.7-max")).toEqual({ input: 0.5, output: 2, cached: 0.25 });
  });

  it("still returns null for a genuinely unknown model", () => {
    expect(getPricingForModel("codex", "totally-unknown-model")).toBeNull();
    expect(getPricingForModel("codex", "totally-unknown-model-high")).toBeNull();
  });
});
