import { beforeEach, describe, expect, it, vi } from "vitest";
import { aggregateComboCapabilities, getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";

const { getComboByName } = vi.hoisted(() => ({ getComboByName: vi.fn() }));
vi.mock("@/lib/localDb", () => ({
  getComboByName,
  getModelAliases: vi.fn(async () => ({})),
  getProviderNodes: vi.fn(async () => []),
}));
const { getComboModels } = await import("../../src/sse/services/model.js");

describe("local routing patches after upstream capability changes", () => {
  beforeEach(() => {
    getComboByName.mockReset();
    getComboByName.mockImplementation(async (name) => name === "9-worker"
      ? { models: ["glm/glm-5.2(high)"] } : null);
  });

  it.each(["glm-5.2", "glm-5.2(high)", "z-ai/glm-5.2(max)"])(
    "uses upstream's canonical GLM limits for %s", (model) => {
      const caps = getCapabilitiesForModel("glm", model);
      expect(caps.contextWindow).toBe(1000000);
      expect(caps.maxOutput).toBe(131072);
      expect(caps.thinkingCanDisable).toBe(false);
    }
  );

  it("retains the 1M context through combo lookup and the new capability aggregation", async () => {
    const models = await getComboModels("9-worker[1m]");
    expect(models).toEqual(["glm/glm-5.2(high)"]);
    expect(getComboByName).toHaveBeenCalledWith("9-worker");
    expect(aggregateComboCapabilities(models).contextWindow).toBe(1000000);
  });

  it("does not strip markers inside combo names", async () => {
    expect(await getComboModels("9[1m]-worker")).toBeNull();
    expect(getComboByName).toHaveBeenCalledWith("9[1m]-worker");
  });

  it("does not interpret a provider/model request as a combo", async () => {
    expect(await getComboModels("cc/claude-opus-5-5[1m]")).toBeNull();
    expect(getComboByName).not.toHaveBeenCalled();
  });
});
