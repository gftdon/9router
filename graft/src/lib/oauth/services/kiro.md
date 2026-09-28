# src/lib/oauth/services/kiro.js

- KiroService · class · L14-L409 — class KiroService
- registerClient · method · L19-L48 — async registerClient(region = "us-east-1")
- startDeviceAuthorization · method · L53-L83 — async startDeviceAuthorization(clientId, clientSecret, startUrl, region = "us-east-1")
- pollDeviceToken · method · L88-L126 — async pollDeviceToken(clientId, clientSecret, deviceCode, region = "us-east-1")
- buildSocialLoginUrl · method · L133-L138 — buildSocialLoginUrl(provider, codeChallenge, state)
- exchangeSocialCode · method · L144-L172 — async exchangeSocialCode(code, codeVerifier)
- refreshToken · method · L177-L236 — async refreshToken(refreshToken, providerSpecificData = {})
- validateImportToken · method · L241-L260 — async validateImportToken(refreshToken)
- listAvailableProfiles · method · L267-L292 — async listAvailableProfiles(accessToken, region = "us-east-1")
- arnOf · function · L289-L289 — arnOf = (p)
- listAvailableApiKeyModels · method · L299-L325 — async listAvailableApiKeyModels(apiKey, region = "us-east-1")
- validateApiKey · method · L331-L350 — async validateApiKey(apiKey, region = "us-east-1")
- listAvailableModels · method · L355-L387 — async listAvailableModels(accessToken, profileArn)
- extractEmailFromJWT · method · L392-L408 — extractEmailFromJWT(accessToken)
