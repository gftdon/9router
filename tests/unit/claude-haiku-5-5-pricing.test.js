// LP-039: Claude Haiku 5.5 is priced by prompt length
// (platform.claude.com/docs/en/about-claude/pricing, checked 2026-10-08):
//   prompt <= 100k: $0.10 in / $0.50 out / $0.01 cache hit / $0.125 5m cache write
//   prompt  > 100k: $0.50 in / $2.50 out / $0.05 cache hit / $0.625 5m cache write
// Before this it fell through to the "claude-haiku-*" glob (Haiku 4.5 rates, 10x).
import { describe, it, expect } from "vitest";
import { getPricingForModel, calculateCostFromTokens } from "../../open-sse/providers/pricing.js";

const rate = (model) => {
  const p = getPricingForModel("claude", model);
  return p && { input: p.input, output: p.output, cached: p.cached, cache_creation: p.cache_creation };
};

describe("Claude Haiku 5.5 pricing", () => {
  it.each(["claude-haiku-5-5", "claude-haiku-5-5(high)", "claude-haiku-5-5(max)"])(
    "prices %s at the Haiku 5.5 short-prompt rate",
    (model) => {
      expect(rate(model)).toEqual({ input: 0.1, output: 0.5, cached: 0.01, cache_creation: 0.125 });
    },
  );

  it("keeps Haiku 4.5 on its own rate", () => {
    expect(rate("claude-haiku-4-5-20251001")).toEqual({ input: 1, output: 5, cached: 0.1, cache_creation: 1.25 });
    expect(rate("claude-haiku-4-5-20251001(high)")).toEqual({ input: 1, output: 5, cached: 0.1, cache_creation: 1.25 });
  });

  it("bills a prompt of exactly 100k tokens at the short-prompt rate", () => {
    const pricing = getPricingForModel("claude", "claude-haiku-5-5");
    const cost = calculateCostFromTokens({ prompt_tokens: 100_000, completion_tokens: 1_000 }, pricing);
    expect(cost).toBeCloseTo((100_000 * 0.1 + 1_000 * 0.5) / 1_000_000, 12);
  });

  it("bills the whole request at the long-prompt rate once the cache-inclusive prompt exceeds 100k", () => {
    const pricing = getPricingForModel("claude", "claude-haiku-5-5(high)");
    // 120k prompt = 10k fresh + 100k cache hit + 10k cache write
    const cost = calculateCostFromTokens(
      { prompt_tokens: 120_000, completion_tokens: 2_000, cached_tokens: 100_000, cache_creation_input_tokens: 10_000 },
      pricing,
    );
    expect(cost).toBeCloseTo((10_000 * 0.5 + 100_000 * 0.05 + 10_000 * 0.625 + 2_000 * 2.5) / 1_000_000, 12);
  });
});
