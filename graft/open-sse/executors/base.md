# open-sse/executors/base.js

- BaseExecutor · class · L11-L185 — class BaseExecutor
- constructor · method · L12-L16 — constructor(provider, config)
- getProvider · method · L18-L20 — getProvider()
- getBaseUrls · method · L22-L24 — getBaseUrls()
- getFallbackCount · method · L26-L28 — getFallbackCount()
- buildUrl · method · L30-L44 — buildUrl(model, stream, urlIndex = 0, credentials = null)
- buildHeaders · method · L46-L76 — buildHeaders(credentials, stream = true)
- transformRequest · method · L79-L81 — transformRequest(model, body, stream, credentials)
- shouldRetry · method · L83-L85 — shouldRetry(status, urlIndex)
- refreshCredentials · method · L88-L90 — async refreshCredentials(credentials, log, proxyOptions = null)
- needsRefresh · method · L92-L94 — needsRefresh(credentials)
- parseError · method · L96-L98 — parseError(response, bodyText)
- execute · method · L100-L184 — async execute({ model, body, stream, credentials, signal, log, proxyOptions = null })
- tryRetry · function · L111-L125 — tryRetry = async (urlIndex, statusKey, reason, response = null)
