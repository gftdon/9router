# src/lib/oauth/services/xai.js

- validateOAuthEndpoint · function · L26-L47 — function validateOAuthEndpoint(rawUrl, field)
- discoverEndpoints · function · L52-L76 — async function discoverEndpoints()
- decodeIdTokenEmail · function · L82-L95 — function decodeIdTokenEmail(idToken)
- XaiService · class · L97-L238 — class XaiService extends OAuthService
- constructor · method · L98-L100 — constructor()
- buildXaiAuthUrl · method · L105-L123 — buildXaiAuthUrl(redirectUri, state, codeChallenge, authorizeUrl)
- exchangeXaiCode · method · L129-L150 — async exchangeXaiCode({ tokenUrl, code, redirectUri, codeVerifier })
- refreshAccessToken · method · L155-L174 — async refreshAccessToken(refreshToken)
- connect · method · L180-L237 — async connect()
