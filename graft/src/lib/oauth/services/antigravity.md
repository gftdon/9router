# src/lib/oauth/services/antigravity.js

- AntigravityService · class · L12-L318 — class AntigravityService
- constructor · method · L13-L15 — constructor()
- buildAuthUrl · method · L20-L32 — buildAuthUrl(redirectUri, state)
- exchangeCode · method · L37-L59 — async exchangeCode(code, redirectUri)
- getUserInfo · method · L64-L78 — async getUserInfo(accessToken)
- getApiHeaders · method · L83-L89 — getApiHeaders(accessToken)
- getMetadata · method · L95-L97 — getMetadata()
- loadCodeAssist · method · L102-L134 — async loadCodeAssist(accessToken)
- onboardUser · method · L139-L152 — async onboardUser(accessToken, projectId, tierId)
- completeOnboarding · method · L157-L180 — async completeOnboarding(accessToken, projectId, tierId, maxRetries = 10)
- fetchProjectId · method · L185-L191 — async fetchProjectId(accessToken)
- saveTokens · method · L196-L222 — async saveTokens(tokens, userInfo, projectId)
- connect · method · L227-L317 — async connect()
