# open-sse/translator/request/openai-to-gemini.js

- generateUUID · function · L6-L8 — function generateUUID()
- sanitizeGeminiFunctionName · function · L27-L37 — function sanitizeGeminiFunctionName(name)
- openaiToGeminiBase · function · L40-L233 — function openaiToGeminiBase(model, body, stream, signature = DEFAULT_THINKING_AG_SIGNATURE, sessionId = null)
- openaiToGeminiRequest · function · L236-L238 — function openaiToGeminiRequest(model, body, stream, credentials = null)
- openaiToGeminiCLIRequest · function · L241-L262 — function openaiToGeminiCLIRequest(model, body, stream, credentials = null)
- wrapInCloudCodeEnvelope · function · L265-L297 — function wrapInCloudCodeEnvelope(model, geminiCLI, credentials = null, isAntigravity = false)
- wrapInCloudCodeEnvelopeForClaude · function · L300-L429 — function wrapInCloudCodeEnvelopeForClaude(model, claudeRequest, credentials = null, signature = DEFAULT_THINKING_AG_SIGNATURE)
- isClaudeModel · function · L433-L435 — function isClaudeModel(model)
- openaiToAntigravityRequest · function · L438-L446 — function openaiToAntigravityRequest(model, body, stream, credentials = null)
