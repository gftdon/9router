# src/lib/db/migrate.js

- MigrationAborted · class · L19-L25 — class MigrationAborted extends Error
- constructor · method · L20-L24 — constructor(message, droppedRows)
- importWithAssertion · function · L28-L39 — function importWithAssertion(adapter, tableName, rows, insertFn, rowMeta)
- readJsonSafe · function · L41-L44 — function readJsonSafe(file)
- isFreshDb · function · L46-L54 — function isFreshDb(adapter)
- runVersionedMigrations · function · L57-L76 — function runVersionedMigrations(adapter)
- syncSchemaFromTables · function · L79-L109 — function syncSchemaFromTables(adapter)
- importLegacyMain · function · L112-L170 — function importLegacyMain(adapter, data)
- importLegacyUsage · function · L172-L196 — function importLegacyUsage(adapter, data)
- importLegacyDisabled · function · L198-L203 — function importLegacyDisabled(adapter, data)
- importLegacyDetails · function · L205-L213 — function importLegacyDetails(adapter, data)
- runMigrationOnce · function · L216-L297 — async function runMigrationOnce(adapter)
