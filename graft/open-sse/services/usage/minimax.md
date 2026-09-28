# open-sse/services/usage/minimax.js

- getMiniMaxField · function · L15-L18 — function getMiniMaxField(model, snakeKey, camelKey)
- getMiniMaxModelName · function · L20-L22 — function getMiniMaxModelName(model)
- formatMiniMaxQuotaName · function · L24-L42 — function formatMiniMaxQuotaName(model)
- getMiniMaxProvidedPercent · function · L44-L51 — function getMiniMaxProvidedPercent(model, snakeKey, camelKey)
- getMiniMaxSessionTotal · function · L53-L55 — function getMiniMaxSessionTotal(model)
- getMiniMaxWeeklyTotal · function · L57-L59 — function getMiniMaxWeeklyTotal(model)
- hasMiniMaxQuota · function · L61-L68 — function hasMiniMaxQuota(model)
- getMiniMaxResetAt · function · L70-L74 — function getMiniMaxResetAt(model, capturedAtMs, remainsSnake, remainsCamel, endSnake, endCamel)
- buildMiniMaxQuota · function · L76-L93 — function buildMiniMaxQuota(total, count, resetAt, countMeansRemaining, providedPercent = null)
- providedPercentage · function · L95-L100 — function providedPercentage(provided, remaining, total)
- addMiniMaxQuota · function · L102-L128 — function addMiniMaxQuota(quotas, key, model, getTotal, countSnake, countCamel, percentSnake, percentCamel, resetArgs, countMeansRemaining)
- getMiniMaxUsage · function · L133-L234 — async function getMiniMaxUsage(apiKey, provider, proxyOptions = null)
