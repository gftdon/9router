# src/lib/oauth/services/github.js

- GitHubService · class · L9-L225 — class GitHubService extends OAuthService
- constructor · method · L10-L12 — constructor()
- getDeviceCode · method · L17-L36 — async getDeviceCode()
- pollAccessToken · method · L41-L100 — async pollAccessToken(deviceCode, verificationUri, userCode, interval = 5000)
- getCopilotToken · method · L105-L121 — async getCopilotToken(accessToken)
- getUserInfo · method · L126-L142 — async getUserInfo(accessToken)
- authenticate · method · L147-L183 — async authenticate()
- connect · method · L188-L224 — async connect()
