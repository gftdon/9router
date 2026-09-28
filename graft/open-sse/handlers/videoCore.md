# open-sse/handlers/videoCore.js

- getVideoConfig · function · L17-L19 — function getVideoConfig(provider)
- sanitizeSecrets · function · L22-L32 — function sanitizeSecrets(text, credentials = null)
- buildUpstreamUrl · function · L34-L37 — function buildUpstreamUrl(config, action, requestId)
- buildHeaders · function · L39-L45 — function buildHeaders({ token, contentType, idempotencyKey })
- combineSignals · function · L47-L53 — function combineSignals(signal, timeoutMs)
- handleVideoProxyCore · function · L77-L209 — async function handleVideoProxyCore({ provider, action = null, requestId = null, rawBody = null, contentType = null, idempotencyKey = null, credentials, signal, timeoutMs = VIDEO_FETCH_TIMEOUT_MS, log, onCredentialsRefreshed, })
- defaultPlan · function · L102-L114 — defaultPlan = ()
- doFetch · function · L117-L133 — doFetch = async ()
