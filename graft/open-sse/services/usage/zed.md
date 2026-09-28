# open-sse/services/usage/zed.js

- formatZedPlanLabel · function · L13-L34 — function formatZedPlanLabel(rawPlan)
- parseZedUsageLimit · function · L39-L63 — function parseZedUsageLimit(limit)
- isZedTokenBillingModelRequestsLimit · function · L66-L69 — function isZedTokenBillingModelRequestsLimit(limitRaw)
- makeZedQuotaRow · function · L71-L105 — function makeZedQuotaRow(name, usedRaw, limitRaw, resetAt = null)
- usageBucketLimit · function · L107-L111 — function usageBucketLimit(bucket)
- parseZedAuthenticatedUserUsage · function · L116-L183 — function parseZedAuthenticatedUserUsage(userInfo)
- getZedUsage · function · L190-L222 — async function getZedUsage( accessToken = null, providerSpecificData = {}, proxyOptions = null, )
