# open-sse/transformer/responsesTransformer.js

- createResponsesLogger · function · L11-L47 — function createResponsesLogger(model, logsDir = null)
- createResponsesApiTransformStream · function · L54-L438 — function createResponsesApiTransformStream(logger = null)
- nextSeq · function · L80-L80 — nextSeq = ()
- emit · function · L82-L87 — emit = (controller, eventType, data)
- startReasoning · function · L90-L114 — startReasoning = (controller, idx)
- emitReasoningDelta · function · L116-L126 — emitReasoningDelta = (controller, text)
- closeReasoning · function · L128-L158 — closeReasoning = (controller)
- closeMessage · function · L160-L194 — closeMessage = (controller, idx)
- closeToolCall · function · L196-L223 — closeToolCall = (controller, idx)
- sendCompleted · function · L225-L240 — sendCompleted = (controller)
- transform · method · L243-L425 — transform(chunk, controller)
- flush · method · L427-L436 — flush(controller)
