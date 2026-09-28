# open-sse/utils/bypassHandler.js

- handleBypassRequest · function · L11-L92 — function handleBypassRequest(body, model, userAgent = "", ccFilterNaming = false)
- getText · function · L16-L22 — getText = (content)
- createOpenAIResponse · function · L99-L122 — function createOpenAIResponse(model, text = DEFAULT_BYPASS_TEXT)
- createNonStreamingResponse · function · L128-L176 — function createNonStreamingResponse(sourceFormat, model, text)
- createStreamingResponse · function · L182-L224 — function createStreamingResponse(sourceFormat, model, text)
- mergeChunksToResponse · function · L230-L274 — function mergeChunksToResponse(chunks, sourceFormat)
- createOpenAIStreamingChunks · function · L279-L313 — function createOpenAIStreamingChunks(completeResponse)
