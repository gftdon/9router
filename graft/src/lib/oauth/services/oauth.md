# src/lib/oauth/services/oauth.js

- OAuthService · class · L10-L156 — class OAuthService
- constructor · method · L11-L13 — constructor(config)
- buildAuthUrl · method · L18-L30 — buildAuthUrl(redirectUri, state, codeChallenge, extraParams = {})
- startAuthFlow · method · L35-L82 — async startAuthFlow(authUrl, providerName)
- exchangeCode · method · L87-L120 — async exchangeCode(code, redirectUri, codeVerifier, contentType = "application/x-www-form-urlencoded")
- authenticate · method · L125-L155 — async authenticate(providerName, buildAuthUrlFn)
