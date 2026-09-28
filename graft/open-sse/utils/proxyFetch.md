# open-sse/utils/proxyFetch.js

- normalizeString · function · L115-L118 — function normalizeString(value)
- resolveRealIP · function · L123-L140 — async function resolveRealIP(hostname)
- shouldBypassMitmDns · function · L145-L150 — function shouldBypassMitmDns(url)
- shouldBypassByNoProxy · function · L152-L165 — function shouldBypassByNoProxy(targetUrl, noProxyValue)
- getEnvProxyUrl · function · L170-L184 — function getEnvProxyUrl(targetUrl)
- normalizeProxyUrl · function · L189-L201 — function normalizeProxyUrl(proxyUrl)
- resolveConnectionProxyUrl · function · L203-L214 — function resolveConnectionProxyUrl(targetUrl, proxyOptions)
- getDispatcher · function · L219-L233 — async function getDispatcher(proxyUrl)
- createBypassRequest · function · L238-L292 — async function createBypassRequest(parsedUrl, realIP, options)
- proxyAwareFetch · function · L294-L354 — async function proxyAwareFetch(url, options = {}, proxyOptions = null)
- patchedFetch · function · L359-L361 — async function patchedFetch(url, options = {})
