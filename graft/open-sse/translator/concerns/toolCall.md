# open-sse/translator/concerns/toolCall.js

- fallbackToolCallId · function · L9-L11 — function fallbackToolCallId(index)
- generateToolCallId · function · L14-L17 — function generateToolCallId(msgIndex = 0, tcIndex = 0, toolName = "")
- sanitizeToolId · function · L20-L24 — function sanitizeToolId(id)
- ensureToolCallIds · function · L27-L74 — function ensureToolCallIds(body)
- getToolCallIds · function · L77-L99 — function getToolCallIds(msg)
- hasToolResults · function · L102-L120 — function hasToolResults(msg, toolCallIds)
- fixMissingToolResponses · function · L123-L154 — function fixMissingToolResponses(body)
- defaultClaudeToolType · function · L165-L168 — function defaultClaudeToolType(tools)
- shouldDefaultClaudeToolType · function · L175-L181 — function shouldDefaultClaudeToolType(provider, finalFormat, tools, PROVIDERS)
