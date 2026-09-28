# open-sse/executors/gemini-cli.js

- GeminiCLIExecutor · class · L5-L87 — class GeminiCLIExecutor extends BaseExecutor
- constructor · method · L6-L8 — constructor()
- buildUrl · method · L10-L13 — buildUrl(model, stream, urlIndex = 0)
- buildHeaders · method · L15-L23 — buildHeaders(credentials, stream = true)
- transformRequest · method · L25-L35 — transformRequest(model, body, stream, credentials)
- parseError · method · L38-L54 — parseError(response, bodyText)
- refreshCredentials · method · L56-L86 — async refreshCredentials(credentials, log)
