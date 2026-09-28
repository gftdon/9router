# open-sse/handlers/chatCore/nonStreamingHandler.js

- parseToolArguments · function · L15-L23 — function parseToolArguments(value)
- openAICompletionToClaudeMessage · function · L25-L63 — function openAICompletionToClaudeMessage(responseBody)
- extractCustomToolInput · function · L72-L79 — function extractCustomToolInput(argumentsValue)
- openAICompletionToResponses · function · L81-L140 — function openAICompletionToResponses(responseBody, customToolNames = null)
- translateNonStreamingResponse · function · L145-L280 — function translateNonStreamingResponse(responseBody, targetFormat, sourceFormat, customToolNames = null)
- handleNonStreamingResponse · function · L285-L404 — async function handleNonStreamingResponse({ providerResponse, provider, model, sourceFormat, targetFormat, body, stream, translatedBody, finalBody, requestStartTime, connectionId, apiKey, clientRawRequest, onRequestSuccess, reqLogger, toolNameMap, customToolNames, trackDone, appendLog, pxpipe, reqTag, log })
