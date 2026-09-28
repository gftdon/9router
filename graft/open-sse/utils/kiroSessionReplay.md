# open-sse/utils/kiroSessionReplay.js

- clone · function · L6-L8 — function clone(value)
- sessionKey · function · L10-L12 — function sessionKey(connectionId, conversationId)
- ensureUserMessageModelId · function · L14-L19 — function ensureUserMessageModelId(message, modelId)
- ensureHistoryModelIds · function · L21-L26 — function ensureHistoryModelIds(history, modelId)
- prefixUserMessage · function · L28-L39 — function prefixUserMessage(message, contentPrefix, modelId)
- findFirstUserIndex · function · L41-L43 — function findFirstUserIndex(history)
- hasToolResults · function · L45-L47 — function hasToolResults(message)
- canReplaceSessionStart · function · L49-L51 — function canReplaceSessionStart(history, firstUserIndex)
- rememberSessionStart · function · L53-L58 — function rememberSessionStart(key, entry)
- applyKiroSessionReplay · function · L65-L132 — function applyKiroSessionReplay({ conversationId, connectionId, modelId, systemPrompt = "", contentPrefix = "", currentContentPrefix = "", history = [], currentMessage, } = {})
- clearKiroSessionReplayStore · function · L134-L136 — function clearKiroSessionReplayStore()
