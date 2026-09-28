# src/lib/oauth/providers/index.js

- getProvider · function · L64-L72 — function getProvider(name)
- getProviderNames · function · L77-L79 — function getProviderNames()
- generateAuthData · function · L85-L121 — async function generateAuthData(providerName, redirectUri, meta)
- exchangeTokens · function · L127-L141 — async function exchangeTokens(providerName, code, redirectUri, codeVerifier, state, meta)
- requestDeviceCode · function · L146-L152 — async function requestDeviceCode(providerName, codeChallenge, options)
- pollForToken · function · L161-L206 — async function pollForToken(providerName, deviceCode, codeVerifier, extraData)
- backfillCodexEmails · function · L212-L244 — async function backfillCodexEmails()
