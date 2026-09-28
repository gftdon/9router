# open-sse/translator/index.js

- register · function · L19-L29 — function register(from, to, requestFn, responseFn)
- ensureInitialized · function · L32-L32 — function ensureInitialized()
- stripContentTypes · function · L35-L49 — function stripContentTypes(body, stripList = [])
- shouldStrip · function · L39-L43 — shouldStrip = (type)
- translateRequest · function · L52-L159 — function translateRequest(sourceFormat, targetFormat, model, body, stream = true, credentials = null, provider = null, reqLogger = null, stripList = [], connectionId = null, clientTool = null)
- translateResponse · function · L162-L219 — function translateResponse(targetFormat, sourceFormat, chunk, state)
- needsTranslation · function · L222-L224 — function needsTranslation(sourceFormat, targetFormat)
- initState · function · L227-L273 — function initState(sourceFormat)
- initTranslators · function · L276-L278 — function initTranslators()
