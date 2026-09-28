# src/lib/auth/dashboardSession.js

- loadJwtSecret · function · L12-L22 — function loadJwtSecret()
- shouldUseSecureCookie · function · L26-L31 — function shouldUseSecureCookie(request)
- createDashboardAuthToken · function · L33-L39 — async function createDashboardAuthToken(claims = {})
- verifyDashboardAuthToken · function · L41-L49 — async function verifyDashboardAuthToken(token)
- getDashboardAuthSession · function · L51-L59 — async function getDashboardAuthSession(token)
- setDashboardAuthCookie · function · L61-L70 — async function setDashboardAuthCookie(cookieStore, request, claims = {})
- clearDashboardAuthCookie · function · L72-L74 — function clearDashboardAuthCookie(cookieStore)
- verifyDashboardPassword · function · L77-L84 — async function verifyDashboardPassword(password)
