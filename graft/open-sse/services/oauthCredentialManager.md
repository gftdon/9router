# open-sse/services/oauthCredentialManager.js

- parseTimeMs · function · L13-L21 — function parseTimeMs(value)
- toExpiresAt · function · L23-L26 — function toExpiresAt(expiresIn, nowMs = Date.now())
- getCredentialExpiryMs · function · L28-L30 — function getCredentialExpiryMs(credentials)
- getCredentialLastRefreshMs · function · L32-L38 — function getCredentialLastRefreshMs(credentials)
- isCodexRefreshStale · function · L40-L43 — function isCodexRefreshStale(credentials, nowMs = Date.now(), maxAgeMs = CODEX_MAX_REFRESH_AGE_MS)
- shouldRefreshCredentials · function · L45-L60 — function shouldRefreshCredentials(provider, credentials, nowMs = Date.now())
- mergeProviderSpecificData · function · L62-L68 — function mergeProviderSpecificData(existing, next)
- mergeRefreshedCredentials · function · L70-L121 — function mergeRefreshedCredentials(provider, currentCredentials, refreshedCredentials, nowMs = Date.now())
- getRefreshLockKey · function · L123-L132 — function getRefreshLockKey(provider, credentials)
- withCredentialRefreshLock · function · L134-L147 — async function withCredentialRefreshLock(provider, credentials, refreshFn)
- refreshProviderCredentials · function · L149-L156 — async function refreshProviderCredentials(provider, credentials, log)
