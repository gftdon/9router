# open-sse/services/tokenRefresh.js

- isUnrecoverableRefreshError · function · L45-L54 — function isUnrecoverableRefreshError(result)
- getRefreshLeadMs · function · L56-L61 — function getRefreshLeadMs(provider)
- parseVertexSaJson · function · L63-L74 — function parseVertexSaJson(apiKey)
- refreshVertexToken · function · L79-L127 — async function refreshVertexToken(saJson, log)
- vertexRefreshHandler · function · L129-L133 — function vertexRefreshHandler(c, log)
- getAccessToken · function · L162-L168 — async function getAccessToken(provider, credentials, log)
- _getAccessTokenInternal · function · L170-L180 — async function _getAccessTokenInternal(provider, credentials, log)
- refreshTokenByProvider · function · L182-L186 — async function refreshTokenByProvider(provider, credentials, log)
- formatProviderCredentials · function · L188-L235 — function formatProviderCredentials(provider, credentials, log)
- getAllAccessTokens · function · L237-L255 — async function getAllAccessTokens(userInfo, log)
- refreshWithRetry · function · L257-L275 — async function refreshWithRetry(refreshFn, maxRetries = 3, log = null)
