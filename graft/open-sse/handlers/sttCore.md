# open-sse/handlers/sttCore.js

- buildAuthHeaders · function · L6-L15 — function buildAuthHeaders(cfg, token)
- resolveAudioContentType · function · L18-L25 — function resolveAudioContentType(file)
- upstreamError · function · L27-L33 — async function upstreamError(res)
- transcribeDeepgram · function · L36-L55 — async function transcribeDeepgram(cfg, file, model, token, formData)
- transcribeAssemblyAI · function · L58-L85 — async function transcribeAssemblyAI(cfg, file, model, token)
- transcribeNvidia · function · L88-L96 — async function transcribeNvidia(cfg, file, model, token)
- transcribeGemini · function · L99-L122 — async function transcribeGemini(cfg, file, model, token, formData)
- transcribeHuggingFace · function · L125-L137 — async function transcribeHuggingFace(cfg, file, model, token)
- transcribeOpenAICompatible · function · L140-L153 — async function transcribeOpenAICompatible(cfg, file, model, token, formData)
- jsonResponse · function · L155-L163 — function jsonResponse(obj)
- handleSttCore · function · L169-L201 — async function handleSttCore({ provider, model, formData, credentials, sttConfig })
