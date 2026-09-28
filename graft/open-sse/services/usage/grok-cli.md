# open-sse/services/usage/grok-cli.js

- unwrapVal · function · L46-L52 — function unwrapVal(value, fallback = 0)
- buildGrokCliHeaders · function · L54-L70 — function buildGrokCliHeaders(accessToken, providerSpecificData = {})
- subscriptionTier · function · L72-L80 — function subscriptionTier(user, config)
- resolvePlan · function · L82-L92 — function resolvePlan(user, config)
- planFromAccessToken · function · L95-L110 — function planFromAccessToken(accessToken)
- makeQuota · function · L112-L135 — function makeQuota({ used, total, resetAt, unlimited = false })
- parseGrokCliBilling · function · L141-L298 — function parseGrokCliBilling(billing, user = null)
- fetchGrokCliCreditsConfig · function · L305-L329 — async function fetchGrokCliCreditsConfig(accessToken, proxyOptions = null)
- quotasFromGrpcCredits · function · L331-L342 — function quotasFromGrpcCredits(decoded)
- getGrokCliUsage · function · L349-L424 — async function getGrokCliUsage(accessToken, providerSpecificData = null, proxyOptions = null)
