# src/lib/db/repos/aliasRepo.js

- getModelAliases · function · L10-L12 — async function getModelAliases()
- setModelAlias · function · L14-L16 — async function setModelAlias(alias, model)
- deleteModelAlias · function · L18-L20 — async function deleteModelAlias(alias)
- customKey · function · L23-L25 — function customKey(providerAlias, id, type)
- getCustomModels · function · L27-L30 — async function getCustomModels()
- addCustomModel · function · L34-L51 — async function addCustomModel({ providerAlias, id, type = "llm", name, caps })
- deleteCustomModel · function · L53-L55 — async function deleteCustomModel({ providerAlias, id, type = "llm" })
- getMitmAlias · function · L58-L64 — async function getMitmAlias(toolName)
- setMitmAliasAll · function · L66-L68 — async function setMitmAliasAll(toolName, mappings)
