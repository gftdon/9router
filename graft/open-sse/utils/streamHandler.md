# open-sse/utils/streamHandler.js

- getTimeString · function · L6-L8 — function getTimeString()
- createStreamController · function · L18-L88 — function createStreamController({ onDisconnect, onError, log, provider, model, reqTag = "" } = {})
- logStream · function · L26-L31 — logStream = (symbol, status, isError = false)
- createDisconnectAwareStream · function · L102-L177 — function createDisconnectAwareStream(transformStream, streamController, onAbortTerminal = null)
- emitTerminal · function · L108-L115 — emitTerminal = (controller)
- pull · method · L118-L169 — async pull(controller)
- cancel · method · L171-L175 — cancel(reason)
- pipeWithDisconnect · function · L195-L259 — function pipeWithDisconnect(providerResponse, transformStream, streamController, onAbortTerminal = null, stallTimeoutMs = STREAM_STALL_TIMEOUT_MS)
- clearStall · function · L203-L205 — clearStall = ()
- armStall · function · L206-L215 — armStall = ()
- transform · method · L234-L246 — transform(chunk, controller)
- flush · method · L247-L247 — flush()
