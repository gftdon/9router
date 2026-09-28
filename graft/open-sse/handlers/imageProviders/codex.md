# open-sse/handlers/imageProviders/codex.js

- decodeAccountId · function · L21-L32 — function decodeAccountId(idToken)
- stripImageSuffix · function · L34-L36 — function stripImageSuffix(model)
- resolveCodexImageModels · function · L38-L43 — function resolveCodexImageModels(model)
- toDataUrl · function · L45-L49 — function toDataUrl(input)
- buildContent · function · L51-L60 — function buildContent(prompt, refs, detail = CODEX_REF_DETAIL)
- parseStream · function · L63-L123 — async function parseStream(response, log, callbacks = {})
- buildSseResponse · function · L126-L160 — function buildSseResponse(providerResponse, log, onSuccess)
- start · method · L128-L149 — async start(controller)
- send · function · L130-L132 — send = (event, data)
- parseResponse · method · L208-L217 — async parseResponse(response, { log, streamToClient, onRequestSuccess })
