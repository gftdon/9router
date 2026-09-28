# open-sse/handlers/chatCore/sseToJsonHandler.js

- isResponsesProvider · function · L10-L10 — isResponsesProvider = (p)
- textFromResponsesMessageItem · function · L13-L20 — function textFromResponsesMessageItem(item)
- pickAssistantMessageForChatCompletion · function · L26-L36 — function pickAssistantMessageForChatCompletion(output)
- extractCustomToolInput · function · L43-L50 — function extractCustomToolInput(argumentsValue)
- chatCompletionToResponses · function · L52-L106 — function chatCompletionToResponses(responseBody, customToolNames = null)
- parseSSEToOpenAIResponse · function · L112-L176 — function parseSSEToOpenAIResponse(rawSSE, fallbackModel)
- handleForcedSSEToJson · function · L182-L359 — async function handleForcedSSEToJson({ providerResponse, sourceFormat, targetFormat, provider, model, body, stream, translatedBody, finalBody, requestStartTime, connectionId, apiKey, clientRawRequest, onRequestSuccess, customToolNames, trackDone, appendLog, reqTag, log })
