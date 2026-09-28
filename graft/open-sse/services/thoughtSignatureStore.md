# open-sse/services/thoughtSignatureStore.js

- signatureFamily · function · L18-L24 — function signatureFamily(model)
- isCompatible · function · L27-L29 — function isCompatible(entry, family)
- pruneMemoryExpired · function · L31-L44 — function pruneMemoryExpired()
- maybePrunePersisted · function · L46-L80 — async function maybePrunePersisted()
- storeGeminiThoughtSignature · function · L86-L117 — function storeGeminiThoughtSignature(toolCallId, signature, sessionId = null, model = null)
- getGeminiThoughtSignature · function · L123-L175 — async function getGeminiThoughtSignature(toolCallId, sessionId = null, model = null)
- getGeminiThoughtSignatureSync · function · L181-L199 — function getGeminiThoughtSignatureSync(toolCallId, sessionId = null, model = null)
