import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("../../open-sse/utils/proxyFetch.js", () => ({ proxyAwareFetch: fetchMock }));
vi.mock("../../open-sse/executors/index.js", async () => {
  const { DefaultExecutor } = await import("../../open-sse/executors/default.js");
  return { getExecutor: (provider) => new DefaultExecutor(provider) };
});
vi.mock("../../open-sse/utils/requestLogger.js", () => ({
  createRequestLogger: async () => ({
    logClientRawRequest: vi.fn(), logRawRequest: vi.fn(), logTargetRequest: vi.fn(),
    logProviderResponse: vi.fn(), logConvertedResponse: vi.fn(), logError: vi.fn(),
  }),
}));
vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(), appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
}));
vi.mock("../../open-sse/handlers/chatCore/nonStreamingHandler.js", () => ({
  handleNonStreamingResponse: async () => ({ success: true, response: new Response("{}") }),
}));

const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");
const { handleComboChat } = await import("../../open-sse/services/combo.js");
const { DefaultExecutor } = await import("../../open-sse/executors/default.js");

describe("Claude Code version forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation(async () => new Response("{}", {
      headers: { "content-type": "application/json" },
    }));
  });

  it.each(["claude-opus-5", "claude-fable-5-1"])(
    "keeps the actual CLI version through Combo to the %s upstream request", async (model) => {
      const userAgent = "claude-cli/2.1.280 (external, cli)";
      const attribution = "x-anthropic-billing-header: cc_version=2.1.280.fixture; cc_entrypoint=cli;";
      const body = {
        model: "9-orchestrator", stream: false, max_tokens: 64,
        system: [{ type: "text", text: attribution }],
        messages: [{ role: "user", content: "Reply with OK." }],
      };
      const log = { debug: vi.fn(), info: vi.fn(), warn: vi.fn() };
      await handleComboChat({
        body, models: [`cc/${model}`], comboName: "9-orchestrator", log,
        handleSingleModel: async (request) => {
          const result = await handleChatCore({
            body: request, modelInfo: { provider: "claude", model }, log,
            credentials: { accessToken: "upstream-fixture", providerSpecificData: {} },
            connectionId: "fixture", sourceFormatOverride: "claude",
            rtkEnabled: false, headroomEnabled: false, cavemanEnabled: false,
            ponytailEnabled: false, pxpipeEnabled: false,
            clientRawRequest: {
              endpoint: "/v1/messages", body: request,
              headers: { "user-agent": userAgent, authorization: "Bearer gateway-fixture" },
            },
          });
          return result.response;
        },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(new URL(url).hostname).toBe("api.anthropic.com");
      expect(new Headers(init.headers).get("user-agent")).toBe(userAgent);
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer upstream-fixture");
      expect(JSON.parse(init.body).system[0].text).toBe(attribution);
    }
  );

  it.each(["claude-cli/2.1.100 (external, cli)", "claude-cli/3.0.0 (external, cli)"])(
    "preserves %s without inventing a different version", (userAgent) => {
      const headers = new DefaultExecutor("claude").buildHeaders({
        accessToken: "fixture", rawHeaders: { "user-agent": userAgent },
      });
      expect(new Headers(headers).get("user-agent")).toBe(userAgent);
    }
  );

  it("forwards the CLI version to a Claude model behind an Anthropic-compatible gateway", () => {
    const userAgent = "claude-cli/2.1.280 (external, cli)";
    const headers = new DefaultExecutor("anthropic-compatible-custom").buildHeaders({
      apiKey: "fixture", rawHeaders: { "user-agent": userAgent },
      providerSpecificData: { baseUrl: "https://gateway.example/v1" },
    }, true, undefined, "claude-opus-5");
    expect(new Headers(headers).get("user-agent")).toBe(userAgent);
  });

  it.each([undefined, "curl/8.0.0"])("retains the default for a non-Claude client (%s)", (userAgent) => {
    const executor = new DefaultExecutor("claude");
    const headers = executor.buildHeaders({ apiKey: "fixture", rawHeaders: { "user-agent": userAgent } });
    expect(headers["User-Agent"]).toBe(executor.config.headers["User-Agent"]);
  });

  it.each([["openai", "gpt-5"], ["anthropic-compatible-custom", "kimi-k3"]])(
    "does not add Claude identity when routing to %s / %s", (provider, model) => {
      const headers = new DefaultExecutor(provider).buildHeaders({
        apiKey: "fixture", rawHeaders: { "user-agent": "claude-cli/2.1.280 (external, cli)" },
      }, true, undefined, model);
      expect(new Headers(headers).get("user-agent")).toBeNull();
    }
  );
});
