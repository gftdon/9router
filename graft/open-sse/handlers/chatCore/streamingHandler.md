# open-sse/handlers/chatCore/streamingHandler.js

- buildTransformStream · function · L26-L42 — function buildTransformStream({ provider, sourceFormat, targetFormat, userAgent, reqLogger, toolNameMap, customToolNames, model, connectionId, body, onStreamComplete, apiKey, credentials })
- handleStreamingResponse · function · L47-L114 — async function handleStreamingResponse({ providerResponse, provider, model, sourceFormat, targetFormat, userAgent, body, stream, translatedBody, finalBody, requestStartTime, connectionId, apiKey, clientRawRequest, onRequestSuccess, reqLogger, toolNameMap, customToolNames, streamController, onStreamComplete, streamDetailId, pxpipe, reqTag, log, credentials })
- buildOnStreamComplete · function · L119-L150 — function buildOnStreamComplete({ provider, model, connectionId, apiKey, requestStartTime, body, stream, finalBody, translatedBody, clientRawRequest, pxpipe, reqTag, log })
- onStreamComplete · function · L122-L147 — onStreamComplete = (contentObj, usage, ttftAt)
