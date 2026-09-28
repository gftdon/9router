# src/sse/services/backgroundTokenRefresh.js

- isTruthyEnv · function · L19-L23 — function isTruthyEnv(value)
- isNonServerRuntime · function · L25-L38 — function isNonServerRuntime()
- selectConnectionsNeedingRefresh · function · L48-L73 — function selectConnectionsNeedingRefresh(connections, nowMs = Date.now())
- loadActiveConnections · function · L75-L79 — async function loadActiveConnections()
- refreshOne · function · L81-L84 — async function refreshOne(connection)
- runBackgroundTokenRefreshTick · function · L90-L139 — async function runBackgroundTokenRefreshTick(deps = {})
- startBackgroundTokenRefresh · function · L146-L170 — function startBackgroundTokenRefresh({ intervalMs } = {})
- safeTick · function · L154-L160 — safeTick = ()
- stopBackgroundTokenRefresh · function · L172-L184 — function stopBackgroundTokenRefresh()
