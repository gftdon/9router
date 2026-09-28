# src/lib/auth/saml.js

- formatX509Certificate · function · L9-L20 — function formatX509Certificate(certStr)
- isSamlConfigured · function · L27-L29 — function isSamlConfigured(settings)
- getSamlRuntimeConfig · function · L35-L41 — async function getSamlRuntimeConfig()
- trimTrailingSlashes · function · L52-L54 — function trimTrailingSlashes(str)
- getSamlBaseUrl · function · L63-L88 — function getSamlBaseUrl(request, settings)
- createSamlInstance · function · L90-L104 — function createSamlInstance(settings, origin)
- buildSamlAuthorizeUrl · function · L112-L123 — async function buildSamlAuthorizeUrl(request, settings)
- validateSamlResponse · function · L133-L163 — async function validateSamlResponse(request, body, expectedRequestId, settings)
- generateSamlMetadata · function · L171-L174 — function generateSamlMetadata(origin, settings)
- pickSamlEmail · function · L182-L223 — function pickSamlEmail(profile = {}, settings = {})
- pickSamlDisplayName · function · L231-L268 — function pickSamlDisplayName(profile = {}, settings = {})
