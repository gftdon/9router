# open-sse/services/usage/codex.js

- toIsoDate · function · L15-L22 — function toIsoDate(value)
- errorMessage · function · L24-L29 — function errorMessage(value, fallback)
- getCodexAccountId · function · L31-L33 — function getCodexAccountId(providerSpecificData)
- getCodexRateLimitBody · function · L35-L40 — function getCodexRateLimitBody(snapshot)
- formatCodexWindow · function · L42-L51 — function formatCodexWindow(window)
- appendCodexQuotaWindows · function · L53-L71 — function appendCodexQuotaWindows(quotas, prefix, snapshot)
- getCodexReviewRateLimit · function · L73-L88 — function getCodexReviewRateLimit(data)
- getCodexSparkRateLimit · function · L90-L105 — function getCodexSparkRateLimit(data)
- getCodexUsage · function · L107-L143 — async function getCodexUsage(accessToken, proxyOptions = null)
- getCodexRateLimitResetCredits · function · L145-L185 — async function getCodexRateLimitResetCredits(accessToken, proxyOptions = null, providerSpecificData = null)
- consumeCodexRateLimitResetCredit · function · L188-L228 — async function consumeCodexRateLimitResetCredit(accessToken, redeemRequestId, proxyOptions = null)
