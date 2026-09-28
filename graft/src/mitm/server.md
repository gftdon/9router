# src/mitm/server.js

- sniCallback · function · L41-L56 — function sniCallback(servername, cb)
- resolveTargetIP · function · L79-L88 — async function resolveTargetIP(hostname)
- collectBodyRaw · function · L90-L97 — function collectBodyRaw(req)
- getMappedModel · function · L99-L118 — function getMappedModel(tool, model)
- passthrough · function · L126-L154 — async function passthrough(req, res, bodyBuffer, onResponse)
- negotiateAlpn · function · L158-L175 — async function negotiateAlpn(host)
- passthroughHttp2 · function · L178-L247 — async function passthroughHttp2(req, res, bodyBuffer, headers, targetHost, onResponse, dumper)
- passthroughHttps · function · L250-L291 — async function passthroughHttps(req, res, bodyBuffer, headers, targetHost, onResponse, dumper)
- killPort · function · L346-L373 — function killPort(port)
- shutdown · function · L393-L400 — shutdown = ()
