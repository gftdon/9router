# open-sse/executors/trae.js

- flattenQuery · function · L22-L42 — function flattenQuery(messages)
- TraeExecutor · class · L44-L339 — class TraeExecutor extends BaseExecutor
- constructor · method · L45-L47 — constructor()
- base · method · L49-L51 — base()
- buildHeaders · method · L53-L66 — buildHeaders(credentials, stream = true)
- resolveMode · method · L69-L76 — resolveMode(model)
- commonParams · method · L79-L100 — commonParams(psd, mode, sessionId)
- createSession · method · L103-L132 — async createSession(headers, query, model, psd, signal)
- streamEvents · method · L136-L174 — async streamEvents(headers, sessionId, replyTo, onEvent, signal)
- onAbort · function · L141-L141 — onAbort = ()
- execute · method · L176-L332 — async execute({ model, body, stream, credentials, signal })
- errResponse · function · L183-L186 — errResponse = (status, message)
- renderNewText · function · L201-L211 — renderNewText = (data)
- emit · function · L217-L217 — emit = (obj)
- refreshCredentials · method · L336-L338 — async refreshCredentials()
