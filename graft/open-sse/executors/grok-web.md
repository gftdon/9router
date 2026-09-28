# open-sse/executors/grok-web.js

- randomString · function · L26-L31 — function randomString(length, alphanumeric = false)
- generateStatsigId · function · L33-L38 — function generateStatsigId()
- randomHex · function · L40-L44 — function randomHex(bytes)
- parseOpenAIMessages · function · L46-L72 — function parseOpenAIMessages(messages)
- readGrokNdjsonEvents · function · L74-L101 — async function* readGrokNdjsonEvents(body, signal)
- extractContent · function · L103-L133 — async function* extractContent(eventStream, isThinkingModel, signal)
- buildStreamingResponse · function · L135-L188 — function buildStreamingResponse(eventStream, model, cid, created, isThinkingModel, signal)
- start · method · L138-L186 — async start(controller)
- buildNonStreamingResponse · function · L190-L219 — async function buildNonStreamingResponse(eventStream, model, cid, created, isThinkingModel, signal)
- GrokWebExecutor · class · L221-L341 — class GrokWebExecutor extends BaseExecutor
- constructor · method · L222-L224 — constructor()
- execute · method · L226-L340 — async execute({ model, body, stream, credentials, signal, log })
