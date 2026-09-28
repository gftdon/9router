# open-sse/services/provider.js

- isOpenAICompatible · function · L14-L16 — function isOpenAICompatible(provider)
- isAnthropicCompatible · function · L18-L20 — function isAnthropicCompatible(provider)
- resolveOpenAICompatibleApiType · function · L27-L31 — function resolveOpenAICompatibleApiType(provider, credentials = null)
- detectFormat · function · L34-L111 — function detectFormat(body)
- getProviderConfig · function · L114-L131 — function getProviderConfig(provider, credentials = null)
- getTargetFormat · function · L134-L143 — function getTargetFormat(provider, credentials = null)
- resolveTransport · function · L148-L153 — function resolveTransport(provider, sourceFormat)
- isLastMessageFromUser · function · L156-L161 — function isLastMessageFromUser(body)
- hasThinkingConfig · function · L164-L166 — function hasThinkingConfig(body)
- normalizeThinkingConfig · function · L170-L175 — function normalizeThinkingConfig(body)
