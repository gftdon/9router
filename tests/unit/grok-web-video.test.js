/**
 * Grok Web (grok.com subscription cookie) video generation — LP-043.
 *
 * Covers:
 *  - `resolution` passthrough (480p default, 720p opt-in, anything else → 400)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("open-sse/services/grokTlsClient.js", () => ({
  GROK_TLS_USER_AGENT: "test-ua",
  GrokTlsUnavailableError: class extends Error {},
  isCloudflareChallenge: () => false,
  grokTlsFetch: vi.fn(),
}));

import { grokTlsFetch } from "open-sse/services/grokTlsClient.js";
import { GrokWebExecutor } from "open-sse/executors/grok-web.js";

const CHAT_URL = "https://grok.com/rest/app-chat/conversations/new";
const credentials = { apiKey: "sso=abc; cf_clearance=xyz" };

const videoStream = [
  JSON.stringify({ result: { conversation: { conversationId: "c1" } } }),
  JSON.stringify({
    result: {
      response: {
        streamingVideoGenerationResponse: {
          progress: 100,
          videoUrl: "users/u/generated/v/generated_video.mp4",
          width: 1280,
          height: 720,
          resolutionName: "720p",
        },
      },
    },
  }),
].join("\n");

function installFakeGrok() {
  grokTlsFetch.mockImplementation(async (url) => {
    if (url === CHAT_URL) return new Response(videoStream, { status: 200 });
    if (String(url).startsWith("https://assets.grok.com/")) return new Response(Buffer.from("mp4bytes"), { status: 200 });
    throw new Error(`unexpected url ${url}`);
  });
}

const callsTo = (url) => grokTlsFetch.mock.calls.filter(([u]) => u === url);
const chatPayload = () => JSON.parse(callsTo(CHAT_URL)[0][1].body);

describe("grok-web video: resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeGrok();
  });

  it("defaults text-to-video to 480p", async () => {
    await new GrokWebExecutor().generateMedia({ prompt: "a boat", kind: "video", credentials });
    expect(chatPayload().mediaGenInput.textToVideo.resolutionName).toBe("480p");
  });

  it("sends 720p when the caller asks for it", async () => {
    await new GrokWebExecutor().generateMedia({ prompt: "a boat", kind: "video", resolution: "720p", credentials });
    expect(chatPayload().mediaGenInput.textToVideo.resolutionName).toBe("720p");
  });

  it("rejects unsupported resolutions with 400 before calling grok", async () => {
    await expect(
      new GrokWebExecutor().generateMedia({ prompt: "a boat", kind: "video", resolution: "1080p", credentials })
    ).rejects.toMatchObject({ status: 400 });
    expect(grokTlsFetch).not.toHaveBeenCalled();
  });
});
