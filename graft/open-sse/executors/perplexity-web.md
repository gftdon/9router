# open-sse/executors/perplexity-web.js

- sessionKey · function · L40-L48 — function sessionKey(history)
- sessionLookup · function · L50-L60 — function sessionLookup(history)
- sessionStore · function · L62-L75 — function sessionStore(history, currentMsg, responseText, backendUuid)
- cleanResponse · function · L77-L90 — function cleanResponse(text, strip = true)
- readPplxSseEvents · function · L92-L136 — async function* readPplxSseEvents(body, signal)
- flush · function · L98-L105 — function flush()
- parseOpenAIMessages · function · L138-L158 — function parseOpenAIMessages(messages)
- buildPplxRequestBody · function · L160-L182 — function buildPplxRequestBody(query, mode, modelPref, followUpUuid)
- formatToolsHint · function · L184-L193 — function formatToolsHint(tools)
- buildQuery · function · L195-L209 — function buildQuery(parsed, followUpUuid, tools)
- extractContent · function · L211-L292 — async function* extractContent(eventStream, signal)
- buildStreamingResponse · function · L294-L355 — function buildStreamingResponse(eventStream, model, cid, created, history, currentMsg, signal)
- start · method · L297-L353 — async start(controller)
- buildNonStreamingResponse · function · L357-L389 — async function buildNonStreamingResponse(eventStream, model, cid, created, history, currentMsg, signal)
- PerplexityWebExecutor · class · L391-L501 — class PerplexityWebExecutor extends BaseExecutor
- constructor · method · L392-L394 — constructor()
- execute · method · L396-L500 — async execute({ model, body, stream, credentials, signal, log })
