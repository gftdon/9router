/**
 * Grok Web (grok.com subscription cookie) video generation — LP-043.
 *
 * Covers:
 *  - `resolution` passthrough (480p default, 720p opt-in, anything else → 400)
 *  - image-to-video: input image is uploaded to grok.com first, then referenced
 *    by its fileMetadataId in mediaGenInput.imageToVideo.inputAssets
 *  - remote image URLs go through the SSRF-hardened fetchImageAsBase64
 *  - videoCore accepts the xAI-style `image: { url }` object
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("open-sse/services/grokTlsClient.js", () => ({
  GROK_TLS_USER_AGENT: "test-ua",
  GrokTlsUnavailableError: class extends Error {},
  isCloudflareChallenge: () => false,
  grokTlsFetch: vi.fn(),
}));

vi.mock("open-sse/translator/concerns/image.js", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchImageAsBase64: vi.fn(),
}));

import { grokTlsFetch } from "open-sse/services/grokTlsClient.js";
import { fetchImageAsBase64 } from "open-sse/translator/concerns/image.js";
import { GrokWebExecutor } from "open-sse/executors/grok-web.js";
import { handleVideoProxyCore } from "open-sse/handlers/videoCore.js";

const UPLOAD_URL = "https://grok.com/rest/app-chat/upload-file";
const CHAT_URL = "https://grok.com/rest/app-chat/conversations/new";
const PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString("base64");
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

function installFakeGrok({ uploadStatus = 200 } = {}) {
  grokTlsFetch.mockImplementation(async (url) => {
    if (url === UPLOAD_URL) {
      return uploadStatus === 200
        ? new Response(JSON.stringify({ fileMetadataId: "asset-1", fileMimeType: "image/png" }), { status: 200 })
        : new Response('{"error":"unauthorized"}', { status: uploadStatus });
    }
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

describe("grok-web video: image-to-video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeGrok();
  });

  it("uploads a data-URI image, then references it in imageToVideo", async () => {
    const [media] = await new GrokWebExecutor().generateMedia({
      prompt: "the boat drifts",
      kind: "video",
      resolution: "720p",
      images: [`data:image/png;base64,${PNG_B64}`],
      credentials,
    });

    const upload = JSON.parse(callsTo(UPLOAD_URL)[0][1].body);
    expect(upload).toMatchObject({
      fileMimeType: "image/png",
      content: PNG_B64,
      fileSource: "IMAGINE_SELF_UPLOAD_FILE_SOURCE",
    });

    const payload = chatPayload();
    expect(payload.mediaGenInput.textToVideo).toBeUndefined();
    expect(payload.mediaGenInput.imageToVideo).toMatchObject({
      prompt: "the boat drifts",
      inputAssets: ["asset-1"],
      resolutionName: "720p",
      mode: "custom",
    });
    expect(payload.fileAttachments).toEqual(["asset-1"]);
    expect(media.mime).toBe("video/mp4");
  });

  it("lets grok derive the aspect ratio from the image unless size is given", async () => {
    const image = `data:image/png;base64,${PNG_B64}`;
    await new GrokWebExecutor().generateMedia({ prompt: "p", kind: "video", images: [image], credentials });
    expect(chatPayload().mediaGenInput.imageToVideo).not.toHaveProperty("aspectRatio");

    vi.clearAllMocks();
    installFakeGrok();
    await new GrokWebExecutor().generateMedia({ prompt: "p", kind: "video", size: "9:16", images: [image], credentials });
    expect(chatPayload().mediaGenInput.imageToVideo.aspectRatio).toBe("9:16");
  });

  it("fetches remote image URLs through the SSRF-hardened fetcher", async () => {
    fetchImageAsBase64.mockResolvedValue({ url: `data:image/png;base64,${PNG_B64}`, mimeType: "image/png" });
    await new GrokWebExecutor().generateMedia({
      prompt: "p", kind: "video", images: ["https://example.com/person.png"], credentials,
    });
    expect(fetchImageAsBase64).toHaveBeenCalledWith("https://example.com/person.png", expect.any(Object));
    expect(JSON.parse(callsTo(UPLOAD_URL)[0][1].body).content).toBe(PNG_B64);
  });

  it("rejects a blocked or unreadable image URL with 400 and never calls grok", async () => {
    fetchImageAsBase64.mockResolvedValue(null);
    await expect(
      new GrokWebExecutor().generateMedia({ prompt: "p", kind: "video", images: ["http://169.254.169.254/x.png"], credentials })
    ).rejects.toMatchObject({ status: 400 });
    expect(grokTlsFetch).not.toHaveBeenCalled();
  });

  it("rejects image refs that are neither http(s) URLs nor data URIs", async () => {
    await expect(
      new GrokWebExecutor().generateMedia({ prompt: "p", kind: "video", images: ["file:///etc/passwd"], credentials })
    ).rejects.toMatchObject({ status: 400 });
    expect(grokTlsFetch).not.toHaveBeenCalled();
  });

  it("rejects more than one input image with 400", async () => {
    const image = `data:image/png;base64,${PNG_B64}`;
    await expect(
      new GrokWebExecutor().generateMedia({ prompt: "p", kind: "video", images: [image, image], credentials })
    ).rejects.toMatchObject({ status: 400 });
    expect(grokTlsFetch).not.toHaveBeenCalled();
  });

  it("stops before generation when the upload fails", async () => {
    installFakeGrok({ uploadStatus: 401 });
    await expect(
      new GrokWebExecutor().generateMedia({
        prompt: "p", kind: "video", images: [`data:image/png;base64,${PNG_B64}`], credentials,
      })
    ).rejects.toThrow(/upload/i);
    expect(callsTo(CHAT_URL)).toHaveLength(0);
  });
});

describe("videoCore: xAI-style image object", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeGrok();
  });

  it("accepts image: { url } and passes it to the executor as an input image", async () => {
    const result = await handleVideoProxyCore({
      provider: "grok-web",
      action: "generations",
      rawBody: JSON.stringify({
        model: "grok-video",
        prompt: "The woman slowly turns toward the camera and smiles",
        image: { url: `data:image/png;base64,${PNG_B64}` },
        resolution: "720p",
      }),
      credentials: { ...credentials },
    });
    expect(result.success).toBe(true);
    expect(callsTo(UPLOAD_URL)).toHaveLength(1);
    expect(chatPayload().mediaGenInput.imageToVideo.resolutionName).toBe("720p");
  });
});
