# open-sse/handlers/fetch/index.js

- sanitizeHeaders · function · L22-L29 — function sanitizeHeaders(headers)
- tryFetch · function · L31-L43 — async function tryFetch(url, init, timeoutMs)
- truncate · function · L45-L49 — function truncate(text, max)
- parseJinaTitle · function · L51-L57 — function parseJinaTitle(text)
- buildData · function · L59-L71 — function buildData({ provider, url, title, format, text, links, costUsd, responseMs, upstreamMs })
- readJsonOrText · function · L73-L79 — async function readJsonOrText(res)
- handleFetchCore · function · L93-L137 — async function handleFetchCore({ url, format, maxCharacters, provider, providerConfig, credentials, log })
- runFirecrawl · function · L139-L168 — async function runFirecrawl({ url, fmt, timeoutMs, apiKey, maxCharacters, costPerQuery, startedAt })
- runJina · function · L170-L197 — async function runJina({ url, fmt, timeoutMs, apiKey, maxCharacters, costPerQuery, startedAt })
- runTavily · function · L199-L227 — async function runTavily({ url, fmt, timeoutMs, apiKey, maxCharacters, costPerQuery, startedAt })
- runExa · function · L229-L257 — async function runExa({ url, fmt, timeoutMs, apiKey, maxCharacters, costPerQuery, startedAt })
- runOllama · function · L259-L310 — async function runOllama({ url, fmt, timeoutMs, apiKey, maxCharacters, costPerQuery, startedAt, baseUrl, })
