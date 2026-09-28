# open-sse/translator/concerns/modality.js

- ph · function · L19-L19 — ph = (cap, isLast)
- capForMime · function · L22-L28 — function capForMime(mime)
- capForOpenAIBlock · function · L31-L37 — function capForOpenAIBlock(block)
- capForClaudeBlock · function · L40-L45 — function capForClaudeBlock(block)
- filterBlocks · function · L49-L58 — function filterBlocks(blocks, capOf, caps, removed, isLast)
- stripOpenAI · function · L61-L82 — function stripOpenAI(body, caps)
- stripClaude · function · L85-L93 — function stripClaude(body, caps)
- stripResponses · function · L96-L109 — function stripResponses(body, caps)
- stripGeminiParts · function · L112-L126 — function stripGeminiParts(contents, caps)
- stripUnsupportedModalities · function · L135-L168 — function stripUnsupportedModalities(body, sourceFormat, caps)
