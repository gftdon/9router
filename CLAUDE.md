# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

9Router (`9router-app`) — a local AI routing gateway + Next.js dashboard. It exposes one OpenAI-compatible endpoint (`/v1/*`) and routes traffic across 40+ upstream providers with format translation, model-combo fallback, multi-account fallback, OAuth/API-key credential management, token refresh, quota/usage tracking, and optional cloud sync.

Two published artifacts live in this one repo:
- The **dashboard + gateway** (root `package.json`, `9router-app`) — the Next.js server that does the actual routing.
- The **CLI launcher** (`cli/`, published to npm as `9router`) — a separate package that installs/starts the server and manages the tray. It has its own `package.json`, version, and build.

The code lives in `src/` (Next.js app + dashboard/compat APIs), `open-sse/` (the provider-agnostic routing/translation engine), `cli/` (the launcher package), and `tests/`.

## Commands

Dashboard/gateway (run from repo root):
```bash
cp .env.example .env
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev   # dev (webpack, port 20127 by default via next dev)
npm run build && PORT=20128 HOSTNAME=0.0.0.0 npm run start           # production
```
- Bun variants: `npm run dev:bun` / `build:bun` / `start:bun`.
- Default runtime port is **20128** (dashboard at `/dashboard`, API at `/v1`).
- Lint: `npx eslint .` (config `eslint.config.mjs`, extends `eslint-config-next`).

CLI package (`cli/`):
```bash
npm run cli:pack       # build + npm pack from root
cd cli && npm run dev  # nodemon watch
```

Tests (vitest, in `tests/`, an **independent** ESM package — not wired into root `npm test`):
```bash
npm install                             # ROOT deps first — tests import from src/ which needs `open`, `undici`, etc.
cd tests && npm install                 # then tests' own deps (vitest) → tests/node_modules (allowed by tests/.gitignore)
npx vitest run                          # all tests; auto-discovers tests/vitest.config.js
npx vitest run unit/capabilities.test.js   # single file (path relative to tests/)
```
> The committed `tests/package.json` `test` script hardcodes Unix paths (`NODE_PATH=/tmp/node_modules …`) — a shared-install workaround from upstream. On Windows (or anywhere), ignore it and use the `npx vitest` form above; `vitest.config.js` resolves the `open-sse`/`@/` aliases from the repo root regardless of where vitest lives.
>
> **The suite is NOT expected to be all-green on a plain checkout.** ~938 pass, ~64 fail. Judge regressions with `tests/__baseline__/verify-no-regression.mjs`, not a raw run. Expected red:
> - 26 catalogued in `tests/__baseline__/known-fails.txt` (rtk, oauth-cursor-auto-import, translator-request-normalization, …).
> - `unit/embeddings.cloud.test.js` imports `cloud/src/handlers/embeddings.js` — the `cloud/` worker dir is **not in this repo**, so it always fails here.
> - `unit/xai-oauth-service.test.js` times out (5s) when the xAI endpoint-discovery fetch isn't reachable/mocked.
> - `real/*.real.test.js` make live provider calls — need credentials, skip otherwise.
- `*.real.test.js` under `tests/translator/real/` make live provider calls — skip unless credentials are set.
- Regression baselines: `tests/__baseline__/verify-*.mjs` compare against committed snapshots (providers, aliases, OAuth URLs). Run these after touching provider registry / alias logic.

## Architecture

Two authoritative docs already exist — read them before working in these areas rather than re-deriving:
- `docs/ARCHITECTURE.md` — full system: request lifecycle, combo/account fallback, OAuth + token refresh, cloud sync, data model.
- `open-sse/AGENTS.md` — the routing/translation engine's own conventions and "how to add a provider/executor/translator". **Read this before editing anything under `open-sse/`.**

### Request flow (the thing to understand first)
`src/app/api/v1/*` route (Next rewrite maps `/v1/*` → `/api/v1/*` in `next.config.mjs`)
→ `src/sse/handlers/chat.js` (parse, combo expansion, account-selection loop)
→ `open-sse/handlers/chatCore.js` (detect source format, translate request, dispatch to executor, retry/refresh, stream setup)
→ `open-sse/executors/*` (per-provider upstream call; `default.js` handles any OpenAI-compatible provider)
→ `open-sse/translator/*` (client format ↔ provider format)
→ SSE back to client.

`src/sse/` is the app-side entry glue; `open-sse/` is the provider-agnostic engine (also usable standalone). Cross that boundary consciously.

### Translator engine (`open-sse/translator/`)
- Pivots through **OpenAI as the intermediate format**. A translator registered on an exact `source:target` pair (e.g. `claude:kiro`) runs as a **direct route**, skipping the lossy double-hop. Prefer a direct route for fragile pairs (thinking blocks, tool ids, non-base64 images, `is_error`).
- Translators **self-register** via `register(from, to, reqFn, resFn)` as an import side effect — a new translator file MUST be imported in `open-sse/translator/index.js` or it never runs.
- Never hardcode role/block/model strings — use `open-sse/translator/schema/` and `open-sse/config/` constants. Config-driven and DRY is enforced by convention here.

### Provider registry (`open-sse/providers/registry/*`)
- One file per provider. `providers/registry/index.js` is an **auto-generated** static import list — regenerate it with `scripts/migrate-registry.mjs` / `injectDisplayToRegistry.mjs`, don't hand-edit.
- Add a provider: copy `providers/REGISTRY_TEMPLATE.js`, add models to `config/providerModels.js`. Only add an executor for non-OpenAI-compatible upstreams.

### Persistence — IMPORTANT (ARCHITECTURE.md is stale here)
State is **no longer `db.json`**. It's a SQLite layer under `src/lib/db/` with an adapter fallback chain (`driver.js`): `bun:sqlite` → `better-sqlite3` (optional native dep) → `node:sqlite` (Node ≥22.5) → `sql.js` (pure-JS fallback, always works). `better-sqlite3` is deliberately in `optionalDependencies` so install never fails without build tools.
- `src/lib/localDb.js` is a **backward-compat shim** re-exporting `src/lib/db/index.js`. New code should import from `@/lib/db/index.js`; per-entity logic lives in `src/lib/db/repos/*`. Schema/migrations in `src/lib/db/migrations/`.
- DB file location resolves via `src/lib/db/paths.js` (`DATA_DIR`, else `~/.9router/`).
- Usage/logs (`src/lib/usageDb.js`, `usage.json` + `log.txt`) still live under `~/.9router` and do **not** follow `DATA_DIR`.

### RTK token saver (`open-sse/rtk/`)
Pre-translate hooks that compress `tool_result` content in-place to cut tokens. **Fail-open**: any error returns null and leaves the body untouched — never throw out of them. Skips `is_error`/`status:"error"` results to preserve traces.

## Conventions & gotchas

- Plain JavaScript (ESM), no TypeScript. `@/*` path alias → `src/*` (`jsconfig.json`).
- `custom-server.js` wraps the Next standalone server to derive client IP from the TCP socket and strip attacker-controlled `X-Forwarded-For` — trusting forwarding headers only from a loopback reverse proxy. Preserve this when touching request/IP/rate-limit code.
- Security-sensitive env: `JWT_SECRET` (session cookie), `INITIAL_PASSWORD` (default `123456` — must override), `API_KEY_SECRET`, `MACHINE_ID_SALT`. Full env contract in `.env.example` and ARCHITECTURE.md's env matrix.
- Binary/protobuf upstreams (kiro EventStream, cursor protobuf, commandcode NDJSON) don't round-trip through OpenAI — they're handled inside their own executor, not the translator.
- **Security-first on PRs**: Security is the top priority when reviewing or creating PRs. Audit authentication, credential/token storage & leaks, header manipulation (`X-Forwarded-For`), and SSRF risks before functional logic. Always include explicit security warnings/notes when reporting PR reviews or changes to the user.
- Versioning: root and `cli/` are versioned independently; changes are logged in `CHANGELOG.md`. Commit style is Conventional Commits (`fix(translator): …`, `feat(...)`).

## Upstream Upgrade & Local Patch Management

โปรเจกต์นี้อ้างอิงโค้ดจาก upstream และอาจมี Local Patches ที่แก้ไข Bug เพิ่มเติมจาก upstream

เป้าหมายสำคัญคือ:

* สามารถอัปเดต upstream version ใหม่ได้โดยไม่ทำ Local Fix สูญหาย
* ไม่แก้ Bug เดิมซ้ำโดยไม่จำเป็น
* ลด merge/rebase conflicts
* ลบ Local Patch เมื่อ upstream แก้ปัญหานั้นอย่างสมบูรณ์แล้ว
* เก็บ Local Patch แต่ละเรื่องแยกจากกันและสามารถตรวจสอบย้อนหลังได้

---

## 1. กฎสำหรับการแก้ Bug

เมื่อพบ Bug และต้องแก้ไขเอง:

1. วิเคราะห์ Root Cause ก่อนแก้ไข
2. ตรวจสอบว่า Bug มาจาก upstream หรือ Local Modification
3. แก้ไขเฉพาะส่วนที่จำเป็น
4. ห้ามรวม Bug Fix หลายเรื่องไว้ใน commit เดียว
5. Run tests / build / typecheck ที่เกี่ยวข้อง
6. เมื่อยืนยันว่าแก้สำเร็จ ให้สร้าง commit แยกสำหรับ Bug นั้น

รูปแบบ commit:

```text
fix(local): <short description>
```

ตัวอย่าง:

```text
fix(local): sanitize unsupported Gemini tool schema fields
fix(local): handle Claude reasoning extraction
fix(local): prevent Antigravity false 429
```

หลังจากนั้นต้องเพิ่มหรืออัปเดตข้อมูลใน:

```text
LOCAL_PATCHES.md
```

---

## 2. LOCAL_PATCHES.md คือ Source of Truth

Local Fix ทุกตัวที่ยังต้องรักษาไว้ต้องถูกบันทึกใน:

```text
LOCAL_PATCHES.md
```

แต่ละ Patch ควรมีอย่างน้อย:

* Patch ID
* Description
* Reason / Root Cause
* Commit
* Related upstream issue/PR (ถ้ามี)
* Files/areas affected
* Status
* Notes

Status ที่ใช้:

```text
ACTIVE
UPSTREAM_FIXED
REMOVED
NEEDS_REVIEW
```

---

## 3. กฎเมื่อ Upgrade Upstream

เมื่อได้รับคำสั่งให้อัปเดต upstream ห้าม update/merge/rebase ทันทีโดยไม่ตรวจ Local Patches ก่อน

ให้ดำเนินการตามลำดับดังนี้

### Step 1 — Inspect Current State

ตรวจสอบ:

* current branch
* current version/tag
* git status
* configured remotes
* local commits
* `LOCAL_PATCHES.md`

หาก working tree มี uncommitted changes ห้ามทำให้ changes เหล่านั้นสูญหาย

---

### Step 2 — Fetch Upstream

Fetch ข้อมูลล่าสุดจาก upstream

```bash
git fetch upstream --tags
```

ตรวจสอบ latest version/tag และ upstream changes ก่อนทำการ upgrade

---

### Step 3 — Review Upstream Changes

ตรวจสอบ:

* changelog
* release notes
* commits
* merged PRs
* relevant issues

โดยเฉพาะ changes ที่เกี่ยวข้องกับรายการใน `LOCAL_PATCHES.md`

---

### Step 4 — Evaluate Every Local Patch

สำหรับ Local Patch ทุกตัวที่มี Status `ACTIVE` ให้ตรวจสอบว่า upstream version ใหม่:

1. ยังไม่มีการแก้ปัญหา
2. แก้บางส่วน
3. แก้ครบแล้ว
4. เปลี่ยน architecture จน Patch เดิมใช้ไม่ได้

ห้ามตัดสินจาก commit message หรือ changelog เพียงอย่างเดียว

ให้ตรวจ implementation จริงเมื่อจำเป็น

---

## 4. Patch Decision

### CASE A — Upstream ยังไม่ได้แก้

รักษา Local Patch ไว้

```text
ACTIVE → ACTIVE
```

Reapply/rebase patch ให้ทำงานกับ upstream version ใหม่

---

### CASE B — Upstream แก้ครบแล้ว

ไม่ต้องนำ Local Patch เดิมกลับมา

เปลี่ยน:

```text
ACTIVE → UPSTREAM_FIXED
```

และบันทึก upstream commit / PR / version ที่แก้ปัญหา

ห้ามเก็บ duplicate implementation โดยไม่มีเหตุผล

---

### CASE C — Upstream แก้บางส่วน

ห้ามลบ Local Patch ทั้งหมด

ให้ปรับ Local Patch ให้เหลือเฉพาะ functionality ที่ upstream ยังไม่มี

Status:

```text
ACTIVE
```

และอัปเดต description ใน `LOCAL_PATCHES.md`

---

### CASE D — ไม่สามารถตัดสินได้

ห้ามลบ Patch

ตั้ง Status:

```text
NEEDS_REVIEW
```

และรายงานเหตุผลให้ผู้ใช้ทราบ

---

## 5. Rebase / Integration

หลังจากประเมิน Local Patches แล้วจึงทำ integration กับ upstream

Preferred strategy:

```bash
git rebase upstream/main
```

หรือ target branch/tag ที่เหมาะสมกับ repository

ห้าม assume ว่า default branch คือ `main` ให้ตรวจ repository ก่อนเสมอ

---

## 6. Conflict Resolution

หากเกิด conflict:

1. อ่าน Local Patch ที่เกี่ยวข้องจาก `LOCAL_PATCHES.md`
2. ตรวจ implementation ใหม่ของ upstream
3. ทำความเข้าใจ intent ของทั้ง upstream และ Local Patch
4. Preserve upstream functionality
5. Preserve Local Fix เฉพาะส่วนที่ upstream ยังไม่ได้แก้
6. ห้ามเลือก `ours` หรือ `theirs` แบบ blind
7. Resolve conflict แบบ semantic

หลัง resolve ต้องตรวจ diff อีกครั้ง

---

## 7. Validation

หลัง upgrade ต้อง run validation ที่ repository รองรับ เช่น:

```text
tests
typecheck
lint
build
```

รวมถึง targeted tests สำหรับ Local Patches ทุกตัวที่ยังเป็น `ACTIVE`

ถ้าไม่มี automated test สำหรับ Patch สำคัญ ให้พิจารณาสร้าง regression test เพื่อป้องกัน Bug เดิมกลับมา

---

## 8. Update Patch Registry

หลัง upgrade ต้องอัปเดต `LOCAL_PATCHES.md`

สำหรับแต่ละ Patch ระบุผลว่า:

```text
KEPT
MODIFIED
UPSTREAM_FIXED
REMOVED
NEEDS_REVIEW
```

พร้อม version ที่ตรวจสอบ

---

## 9. Upgrade Report

เมื่อทำงานเสร็จ ให้รายงานแบบสั้นและชัดเจน:

```text
Upstream:
v0.5.81 → v0.5.82

Local Patches:

LP-001 Gemini Schema
Result: UPSTREAM_FIXED
Action: Local patch removed

LP-002 Reasoning Extraction
Result: KEPT
Action: Rebased successfully

LP-003 Antigravity 429
Result: MODIFIED
Action: Adapted to upstream changes

Validation:
Tests: PASS
Typecheck: PASS
Build: PASS
```

หากมี failure ต้องรายงาน ห้ามซ่อนหรือถือว่า upgrade สำเร็จ

---

## 10. Safety Rules

ห้าม:

* ลบ Local Patch โดยไม่ได้ตรวจ upstream implementation
* overwrite uncommitted user changes
* force push โดยไม่ได้รับคำสั่ง
* reset หรือ discard user changes เพื่อแก้ conflict
* รวม Local Patches หลายเรื่องเป็น commit เดียวโดยไม่จำเป็น
* แก้ unrelated code ระหว่าง upstream upgrade
* assume ว่า Patch ไม่จำเป็นเพียงเพราะ upstream release note บอกว่า Bug ถูกแก้แล้ว

---

## 11. Core Principle

ทุกครั้งที่ Upgrade ให้คิดตามหลักนี้:

```text
NEW UPSTREAM
      +
LOCAL PATCH REGISTRY
      ↓
COMPARE IMPLEMENTATION
      ↓
KEEP / MODIFY / DROP
      ↓
REBASE
      ↓
RESOLVE CONFLICTS
      ↓
TEST
      ↓
UPDATE LOCAL_PATCHES.md
```

เป้าหมายไม่ใช่เพียงทำให้ Git merge ผ่าน

เป้าหมายคือ:

> Upgrade upstream โดยรักษาเฉพาะ Local Fix ที่ยังจำเป็น และกำจัด Local Fix ที่ upstream รองรับแล้วอย่างปลอดภัย
