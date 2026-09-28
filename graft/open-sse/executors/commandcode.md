# open-sse/executors/commandcode.js

- CommandCodeExecutor · class · L18-L78 — class CommandCodeExecutor extends BaseExecutor
- constructor · method · L19-L21 — constructor()
- transformRequest · method · L23-L26 — transformRequest(model, body, stream, credentials)
- buildHeaders · method · L28-L40 — buildHeaders(credentials, stream = true)
- execute · method · L42-L61 — async execute(opts)
- parseError · method · L63-L77 — parseError(response, bodyText)
- parseCommandCodeError · function · L80-L138 — function parseCommandCodeError(event)
- inspectAndWrapCommandCodeResponse · function · L140-L243 — async function inspectAndWrapCommandCodeResponse(originalResponse, model)
- createReplayedStream · function · L245-L285 — function createReplayedStream(bufferedLines, remainingBuffer, reader)
- pull · method · L250-L276 — async pull(controller)
- cancel · method · L277-L283 — async cancel(reason)
- wrapNdjsonAsOpenAISse · function · L287-L334 — function wrapNdjsonAsOpenAISse(streamBody, model, originalResponse = null)
- emitChunks · function · L293-L300 — emitChunks = (chunks, controller)
- transform · method · L303-L312 — transform(chunk, controller)
- flush · method · L313-L319 — flush(controller)
