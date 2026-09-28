# open-sse/translator/request/openai-to-cursor.js

- extractContent · function · L14-L26 — function extractContent(content)
- sanitizeToolResultText · function · L28-L31 — function sanitizeToolResultText(text)
- escapeXml · function · L33-L35 — function escapeXml(text)
- buildToolResultBlock · function · L37-L46 — function buildToolResultBlock(toolName, toolCallId, resultText)
- normalizeToolCallId · function · L48-L50 — function normalizeToolCallId(id)
- convertMessages · function · L52-L170 — function convertMessages(messages)
- rememberToolMeta · function · L57-L65 — rememberToolMeta = (toolCallId, toolName)
- openaiToCursorRequest · function · L172-L183 — function openaiToCursorRequest(model, body, stream, credentials)
