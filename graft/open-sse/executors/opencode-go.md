# open-sse/executors/opencode-go.js

- normalizeSession · function · L20-L25 — function normalizeSession(value)
- nativeSession · function · L27-L33 — function nativeSession(headers)
- translatedSession · function · L35-L42 — function translatedSession(sessionId, clientTool)
- baseModelId · function · L45-L47 — function baseModelId(model)
- isResponsesModel · function · L51-L54 — function isResponsesModel(model)
- normalizeResponsesTools · function · L58-L88 — function normalizeResponsesTools(body)
- sanitizeResponsesItems · function · L93-L117 — function sanitizeResponsesItems(body)
- OpenCodeGoExecutor · class · L119-L192 — class OpenCodeGoExecutor extends DefaultExecutor
- constructor · method · L120-L122 — constructor()
- buildUrl · method · L124-L128 — buildUrl(model, stream, urlIndex = 0, credentials = null)
- prepareRequestCredentials · method · L130-L144 — prepareRequestCredentials({ body, credentials, providerSessionId, clientTool } = {})
- execute · method · L146-L149 — async execute(args)
- buildHeaders · method · L151-L162 — buildHeaders(credentials, stream = true, url, model)
- transformRequest · method · L164-L191 — transformRequest(model, body, stream, credentials)
