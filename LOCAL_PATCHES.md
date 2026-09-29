# Local Patches — สิ่งที่แก้เองนอกเหนือจาก upstream

> เอกสารนี้บันทึก patch ที่เราแก้เองบน fork (`gftdon/9router`) แต่ยังไม่ได้ขึ้น upstream (`decolua/9router`)
> **ทุกครั้งที่อัปเดต 9router เวอร์ชันใหม่ ให้เช็คไฟล์นี้ก่อน** — ถ้า patch ถูกเขียนทับ ให้ re-apply ตามขั้นตอนด้านล่างของแต่ละเคส

## สรุป patch ทั้งหมด (ตามลำดับ commit)

| Commit | ไฟล์ที่แก้ | แก้อะไร | สถานะ |
|---|---|---|---|
| `b55f405e` | `open-sse/providers/capabilities.js` | Patch 1: เหลือเฉพาะ strip effort suffix; ใช้ GLM-5.2 limits จาก upstream | ACTIVE / KEPT (v0.5.91) |
| `0bb6cc65` | `src/sse/services/model.js` | Patch 2: strip `[1m]` suffix ตอน resolve combo name | ACTIVE / REDUNDANT-สำหรับ chat path (v0.5.91) |
| `c31f4070` | `open-sse/translator/formats/gemini.js` | LP-006: strip schema annotations โดยรักษาชื่อ property จริง (เพิ่มทะเบียนย้อนหลัง) | ACTIVE / KEPT (v0.5.91) |
| `b35cdcac` | `open-sse/translator/formats/claude.js` | LP-003: preserve native Claude thinking blocks and opaque signatures | ACTIVE / KEPT (v0.5.91) |
| `ac47e8b7` | `open-sse/executors/default.js` | LP-004: forward the actual Claude Code client version | ACTIVE / KEPT (v0.5.91, rebased) |
| `83bda598` | `open-sse/providers/shared.js` | LP-005: update the dashboard compatibility default for Opus 5.5 | UPSTREAM_FIXED (`cbffeb97`) |
| — | `open-sse/translator/formats/gemini.js` | Bug A: `reason` injection (ยังไม่ได้แก้) | NEEDS_REVIEW |
| `1df544ca` | `open-sse/providers/pricing.js` | LP-007: เรตตระกูล gpt-6 ตามราคาทางการ OpenAI | ACTIVE |
| `99ec5852` | `open-sse/providers/pricing.js` | LP-008: resolve ราคาเมื่อ model id มี effort suffix | ACTIVE |
| `b6298d96` | `open-sse/providers/pricing.js` | LP-009: gpt-5.6 sol/luna/terra ไม่ตก wildcard + เรตตรงทางการ | ACTIVE |
| `d09abdcb` | `src/lib/db/repos/usageRepo.js` | LP-010: warn เมื่อไม่มี pricing entry (เลิกเงียบ) | ACTIVE |
| `594fcba0` | `tests/vitest.config.js` | LP-011: บังคับ DATA_DIR แยกตอนรันเทส (กัน DB จริงโดนเขียน) | ACTIVE |
| `cc176d22` | `scripts/backfill-usage-cost.mjs`, `src/lib/db/helpers/dateKey.js` | LP-012: สคริปต์ backfill ยอด cost ย้อนหลัง | ACTIVE |
| `ba910b94` | `open-sse/utils/museSparkToolSchema.js`, `open-sse/executors/opencode{,-go,-zen}.js` | LP-013: จำกัดความลึก tool schema ≤10 ชั้น เฉพาะ Muse Spark | ACTIVE |

> ทั้ง 2 patch แรกแก้ **Bug B (autocompact thrash)** ร่วมกัน — Patch 1 แก้ caps ผิด, Patch 2 ทำให้ client ขอ 1M window ผ่าน combo ได้จริง

## ตรวจ Local Patches เมื่ออัปเดตเป็น v0.5.91 — 2026-09-28

Upstream: tag `v0.5.91`, commit `f01fb909e37189008080632ddaf404f096345cde` (38 commits, 123 files เทียบกับ `v0.5.86`)
Merge commit ของ fork: `302e119d`; ตรวจ implementation จริงของ upstream ทุกตัว ไม่ได้ตัดสินจาก changelog

ก่อนอัปเดตต้องเพิ่ม remote `upstream` กลับ — git config ของ checkout นี้เหลือแค่ `origin` (`gftdon/9router`)
และ ref `upstream/master` ที่ค้างอยู่ชี้ v0.5.45 ซึ่งเก่ากว่าความจริงมาก:

```bash
git remote add upstream https://github.com/decolua/9router.git
git fetch upstream --tags
```

### ไฟล์ที่ upstream แตะทับแพตช์

| ไฟล์ | upstream commit ใน v0.5.86..v0.5.91 | ผลต่อแพตช์ |
|---|---|---|
| `open-sse/executors/default.js` | `dc198dff` (merge client anthropic-beta + rate-limit headers), `6aea3875` (forward `x-claude-code-session-id`) | **conflict** — resolve แบบ semantic |
| `open-sse/providers/capabilities.js` | `fdcba3e1` (เลิก cache catalog source), `37a6b7e0` (`resolveCaps` ใน `aggregateComboCapabilities`) | auto-merge คนละบล็อกกับ Patch 1 |
| `open-sse/translator/formats/gemini.js` | `30464bc2` (guard terminal model turn ใน `normalizeGeminiContents`) | auto-merge คนละบล็อกกับ LP-006 |
| `open-sse/providers/shared.js` | `dc198dff` (เพิ่ม `mergeAnthropicBeta`) | ไม่กระทบ (LP-005 UPSTREAM_FIXED อยู่แล้ว) |
| `src/sse/services/model.js`, `open-sse/translator/formats/claude.js` | — (upstream ไม่แตะ) | Patch 2 / LP-003 รอดโดยไม่ต้อง rebase |

### ผลประเมินรายแพตช์

| Patch | ผล | หลักฐานที่ตรวจจริงใน v0.5.91 |
|---|---|---|
| Patch 1 — GLM-5.2 suffix lookup | KEPT | `getCapabilitiesForModel` ของ upstream ยังไม่ strip suffix เลย (grep `replace(/\(` ใน `capabilities.js` = 0 hit) — `glm-5.2(high)` ยังตกไป pattern tier ถ้าไม่มีแพตช์ ยืนยัน runtime: ctx = 1000000 ทั้ง `glm-5.2` และ `glm-5.2(high)` |
| Patch 2 — Combo `[1m]` | **REDUNDANT สำหรับ chat path** (เก็บไว้) | แก้คำตัดสินของรอบ v0.5.86: upstream **มี** `stripModelContextMarker` ที่ `src/sse/handlers/chat.js:55` และ strip `[1m]` ใส่ `body.model` **ก่อน** เรียก `getComboModels` ที่บรรทัด 97/172 — และมีมาแล้วตั้งแต่ v0.5.86 (`open-sse/utils/modelMarkers.js` ไม่เปลี่ยนเลยระหว่าง v0.5.86→v0.5.91) รอบก่อนตรวจแค่ `src/sse/services/model.js` จึงสรุปว่า KEPT ผิด ส่วนที่แพตช์ยังคุ้มอยู่คือ `getComboModels` อีก 2 call site ที่ไม่ strip: `src/sse/handlers/tts.js:48` และ `src/sse/handlers/imageGeneration.js:50` (ในทางปฏิบัติ client ไม่ส่ง `[1m]` มาทาง TTS/image) ยังไม่ลบเพราะการลบเป็นการเปลี่ยน behavior ที่ไม่จำเป็นต่อการอัปเกรด — **ผู้สมัครถอดออกใน commit แยก** |
| LP-003 — native thinking | KEPT | `normalizeClaudePassthrough` ของ upstream ยังใช้ `isValidClaudeSignature(block.signature)` ทิ้ง block และยัง `unshift(buildThinkingPlaceholder("claude"))` (v0.5.91 `claude.js:272,287`) ทั้งไฟล์ไม่ถูกแตะระหว่าง v0.5.86→v0.5.91 |
| LP-004 — native client version | KEPT (rebased) | v0.5.91 `default.js` ไม่มีการอ่าน `rawHeaders["user-agent"]` เลย (grep เจอเฉพาะ `anthropic-beta` และ UA คงที่ของ kiro) ยังทับ UA ด้วย `CLAUDE_CLI_VERSION` คงที่เหมือนเดิม `84035760` แก้แค่ test fixture/baseline ไม่ใช่ตัว logic |
| LP-005 — dashboard version | UPSTREAM_FIXED (คงเดิม) | `open-sse/providers/shared.js:25` = `CLAUDE_CLI_VERSION = "2.1.280"` ยังตรงตาม fix `cbffeb97` ไม่มี implementation ของ LP-005 เหลือใน fork เก็บเฉพาะ regression coverage |
| LP-006 — Gemini schema | KEPT | v0.5.91 `gemini.js` ไม่มีคำว่า `errorMessage` เลย (0 hit) และ `removeUnsupportedKeywords` ยังไม่มีพารามิเตอร์ `isPropertyMap` → ยังลบ property ที่ชื่อตรงกับ keyword ยืนยัน runtime: property ชื่อ `errorMessage` รอด และ annotation `errorMessage` ถูก strip |
| Bug A — empty-schema `reason` | NEEDS_REVIEW (ไม่เปลี่ยน) | `cleanJSONSchemaForAntigravity({type:"object",properties:{}})` ยังคืน `properties.reason` + `required:["reason"]` (v0.5.91 `gemini.js:401,406,413,418`) ยังเป็นประเด็นค้าง ไม่ได้เกิดจากรอบนี้ ยืนยันระดับ schema transformation เท่านั้น ไม่ได้ยิง live Gemini tool-call |

### Conflict ที่ resolve และเหตุผล

**`open-sse/executors/default.js`** — upstream เขียนบล็อก Anthropic-Beta ทับตำแหน่งที่ LP-004 hoist ตัวแปร `isClaudeUpstream` ออกมา
resolve โดยเก็บ **ทั้งสองฝั่ง**: ใช้ logic ใหม่ของ upstream ครบ (`mergeAnthropicBeta(selectAnthropicBeta(model, body), clientBeta)`,
สาขา `provider === "anthropic"`, และการเติม `x-claude-code-session-id` จาก `metadata.user_id` สำหรับ token `sk-ant-oat`)
แต่ให้เงื่อนไขอ่านจาก `isClaudeUpstream` ที่ LP-004 ต้องใช้ต่อ — `model && isClaudeUpstream` เทียบเท่าเงื่อนไขเดิมของ upstream แบบตรงตัว
ไม่ได้เลือก ours/theirs แบบ blind และ `git diff v0.5.91` เหลือเฉพาะ 2 hunk ของ LP-004 เท่านั้น

**`tests/unit/claude-cloaking.test.js`** — ทั้งสองฝั่ง assert `cc_version=2.1.280` เหมือนกัน ต่างแค่ escape จุดใน regex
เก็บฝั่ง fork ที่ escape ถูก (`2\.1\.280`) เพราะเข้มกว่าและความหมายเท่ากัน

### Validation (2026-09-28)

- **Full suite:** ก่อน merge 2,616 passed / 93 failed (71 ไฟล์แดง), หลัง merge **2,764 passed / 97 failed** (73 ไฟล์แดง) จาก 2,920 tests
  upstream เพิ่มเทสใหม่ 152 รายการ เทียบผลราย assertion (ไม่ใช่ raw count) แล้ว **ไม่มี regression จากแพตช์หรือ merge**
- **เทสที่เปลี่ยนจากเขียวเป็นแดง 4 รายการ = ข้อบกพร่องของ upstream ไม่ใช่ของ merge** — `unit/image-generation.test.js`
  (`gpt-5.5-image`, `gpt-5.6-sol-image`, `gpt-5.6-terra-image`, `gpt-5.6-luna-image`) พิสูจน์โดยรัน worktree ของ **tag `v0.5.91` เปล่า**
  ได้ผลแดง 4 รายการเดียวกันเป๊ะ (4 failed / 17 passed) สาเหตุ: `95600db1` ขยับ `CODEX_CLI_VERSION` เป็น `0.155.0`
  ใน `open-sse/providers/registry/codex.js:5` และอัปเดต `unit/codex-gpt6-lite.test.js` แล้ว แต่ลืม `unit/image-generation.test.js:354`
  ที่ยัง assert `version: "0.154.0"` → เป็น fixture ค้าง ไม่ใช่บั๊กของ product
- **Patch regression tests:** `local-patch-routing`, `claude-native-thinking`, `claude-client-version`,
  `gemini-schema-clean-errormessage`, `claude-cloaking` → **5 ไฟล์ 44 tests ผ่านทั้งหมด**
- **Baselines:** aliases (117 tokens) ✅ byte-for-byte, OAuth URLs ✅ byte-for-byte,
  providers ❌ 1 field diff = `codex.headers` `0.154.0` → `0.155.0` + เพิ่ม `version` header
  ซึ่งเป็น**ผลที่ upstream ตั้งใจใน `95600db1`** แต่ upstream ไม่ได้ refresh `tests/__baseline__/providers-baseline.json`
  (รากเดียวกับเทส 4 รายการข้างบน) **ยังไม่ refresh snapshot ในรอบนี้** เพราะเป็นการแก้นอกขอบเขต upgrade — ค้างไว้เป็น commit แยก
- **ESLint:** ไฟล์แพตช์และไฟล์ที่ resolve conflict ผ่านทั้งหมด
- **Build:** `npm run build` ผ่านที่เวอร์ชัน 0.5.91 รวมขั้น `postbuild` copy standalone assets
- **Versions:** root manifest และ CLI manifest = **0.5.91** ตรงกับ upstream ทั้งคู่ (merge พามาเอง ไม่ต้อง bump มือ)
- **`git diff --check`** เตือน blank line at EOF 2 จุด (`.github/workflows/tray-binaries.yml:176`,
  `src/app/(dashboard)/dashboard/cli-tools/components/codexConfig.js:86`) ทั้งคู่เป็นไฟล์ของ upstream ที่ไม่มี local delta
  (`git diff v0.5.91` ว่าง) และเตือนเหมือนกันบน tag เปล่า
- **ยังไม่ได้ทำในรอบนี้:** ไม่ได้ `npm run cli:pack`, ไม่ได้ติดตั้ง global, ไม่ได้รีสตาร์ต LaunchAgent และไม่ได้ยิง live probe
  (`/api/health`, Add Model test, native Claude Code / Combo probe) — การยืนยันระดับ deployment ของ v0.5.91 จึง **ยังไม่มี**
  ต่างจากรอบ v0.5.86 ที่บันทึกผลติดตั้งจริงไว้

## ตรวจ Local Patches เมื่ออัปเดตเป็น v0.5.86 — 2026-09-24

Upstream: tag `v0.5.86`, commit `39e36d3d0c849e0e01dfeacddf111edf892448fc`. เทียบ implementation จริงกับ fork v0.5.82 (`a4e9bff3`); ตัวที่ติดตั้งก่อนอัปเดตคือ v0.5.81 พร้อมแพตช์ LP-003–LP-005

| Patch | ผล | หลักฐานและการปรับ |
|---|---|---|
| Patch 1 — GLM-5.2 | MODIFIED | `5c217d34` เพิ่ม canonical GLM-5.2 1M / 131072 แล้ว จึงลบ provider override เดิมที่ทับ maxOutput เป็น 128000 แต่เก็บ suffix lookup เพราะ upstream ยังอ่าน `glm-5.2(high)` ไม่ตรง exact entry |
| Patch 2 — Combo `[1m]` | KEPT | `src/sse/services/model.js` ของ upstream ยัง lookup Combo ด้วยชื่อเต็มรวม suffix |
| LP-003 — native thinking | KEPT | upstream ยังตรวจ signature แบบเดิมและแทรก placeholder; การแก้ refusal ใน `0f488c70` เป็นฝั่ง response จึงไม่แทนแพตช์นี้ |
| LP-004 — native client version | KEPT | upstream ยังใช้ static User-Agent ใน executor โดยไม่ส่งค่าจริงจาก native client |
| LP-005 — dashboard version | UPSTREAM_FIXED | `cbffeb97` เปลี่ยน `CLAUDE_CLI_VERSION` เป็น 2.1.280 และเพิ่ม Opus 5.5; ใช้ไฟล์ `shared.js` ของ upstream โดยตรง เก็บ regression tests ไว้ |
| LP-006 — Gemini schema | KEPT | upstream ยังไม่ strip `errorMessage` / `errorMessages` และยังลบชื่อ property ที่ตรงกับ keyword; เพิ่มทะเบียนให้แพตช์ `c31f4070` ที่ตกหล่น |
| Bug A — empty-schema `reason` | NEEDS_REVIEW | upstream ยังแทรก required `reason` ใน schema ว่างเหมือนเดิม เป็นประเด็นค้างเดิม ไม่ได้เกิดจากการอัปเดตครั้งนี้ |

Regression coverage เพิ่มการรักษา thinking และ native version ของ Opus 5.5 รวมถึง Combo `[1m]` → GLM `(high)` → capability aggregation ใหม่ ส่วน provider snapshot ปรับเฉพาะค่า Claude User-Agent ให้ตรง 2.1.280 ที่ upstream เปลี่ยนแล้ว

**ผลตรวจ source:** 39 test files ผ่าน 500 tests และชุด `DefaultExecutor.buildHeaders` ผ่านอีก 17 tests (ข้าม 3 proxy-transport tests ที่อยู่นอกขอบเขตนี้); ESLint สำหรับไฟล์แพตช์/เทสที่แก้ผ่าน และ baseline checks ของ providers (83), aliases (117) และ OAuth URLs ผ่าน ไม่ได้อ้างว่าทั้ง test suite ผ่านทั้งหมด ยืนยัน Bug A ด้วย schema ว่างแล้วว่ายังได้ `properties.reason` และ `required: ["reason"]`

### Build / install / live verification (2026-09-24)

- รวม upstream และแพตช์ใน merge commit `a24a17ff`; root manifest, CLI manifest และแพ็กเกจ global เป็น **0.5.86** ตรงกัน
- `npm run cli:pack` ผ่าน ได้ `9router-0.5.86.tgz` (15,247,433 bytes); SHA-256 `90b13a080170334c0af8cd63a6e82e6f9e9728981f4e73a791babdbb09b6c1df`; build ID `egj0Qlh6HIzPwE91jYWc2`
- ตรวจ executor ในแพ็กเกจจริง: native User-Agent ยังคงเวอร์ชันที่ส่งมา และกรณีไม่มี native identity ใช้ `claude-cli/2.1.280 (external, sdk-cli)`
- สำรองแพ็กเกจเดิมและ SQLite snapshot ที่ `/tmp/9router-before-v0586-20260924/` (directory mode 0700, database mode 0600) ก่อนติดตั้ง global และรีสตาร์ต LaunchAgent เดิม โดยไม่แก้ plist
- เริ่มแรกตัวนับรายงานงานค้าง 2 กลุ่ม รวม 15 requests จึงรอก่อน ผู้ใช้ยืนยันว่าพักงานและให้ดำเนินการแล้ว จึงรีสตาร์ตตามการยืนยันนั้น ไม่ได้อ้างว่าตัวนับลดเป็นศูนย์ก่อนรีสตาร์ต
- Runtime เปลี่ยน listener PID 3657 → 4571 ณ เวลาติดตั้ง; `/api/health` คืน `{"ok":true}` หลังเริ่มและหลัง live probes; server JavaScript ทั้ง **503 ไฟล์** ใน global ตรงกับแพ็กเกจที่ build
- Combo ทั้ง 7 รายการ (ชื่อและ model list) เหมือนเดิมก่อน/หลังติดตั้งและหลัง live probes; provider connection count ยังคง 9 รายการ ไฟล์งานเดิมของผู้ใช้ 5 ไฟล์ใน checkout มี SHA-256 เดิมและไม่ถูกรวมใน commit นี้
- **Add Model:** `POST /api/models/test` ด้วย `cc/claude-opus-5-5` คืน `{"ok":true,"latencyMs":2777,"error":null,"status":200}`
- **Native Claude Code 2.1.281:** direct `cc/claude-opus-5-5` ผ่านสองครั้งติดต่อกัน โดยแต่ละครั้งใช้ `Read` ต่อเนื่อง 2 calls และอ่าน marker จากไฟล์ที่สองได้; response model เป็น `claude-opus-5-5`
- **Combo จริง:** `9-orchestrator[1m]` ผ่าน native CLI และ `Read` 2 calls; response model เป็น `claude-opus-5-5` จึงไม่ได้สำเร็จจาก Kimi fallback
- **ข้อจำกัด:** native probe ครั้งแรกคืน synthetic error ก่อนเริ่ม tool แต่ตัวบันทึกในครั้งนั้นไม่ได้เก็บข้อความสาเหตุ จึงยังสรุปสาเหตุไม่ได้; direct probes ที่ตรวจซ้ำสองครั้งและ Combo probe ผ่าน ผลนี้ไม่ยืนยันว่าปัญหา refusal เป็นครั้งคราวทุกแบบหายแล้ว

Local evidence: `/tmp/9router-v0586-tests.json`, `/tmp/9router-v0586-build-20260924.log`, `/tmp/9router-v0586-deployment-receipt.json`, `/tmp/9router-v0586-native-probe-result.json`, `/tmp/9router-v0586-combo-probe-result.json` (เป็นไฟล์ชั่วคราว; ผลสำคัญบันทึกไว้ข้างต้นแล้ว)

## ประวัติการแก้ Claude สำหรับ v0.5.82

| เส้นทาง | Patch | พฤติกรรมที่ต้องรักษาไว้ |
|---|---|---|
| Claude Code native → Claude | LP-003 | เก็บ thinking / redacted-thinking และ opaque signature เดิม ไม่แทรก signed placeholder |
| Claude Code native → Claude | LP-004 | ส่ง User-Agent และเวอร์ชันจริงจาก client รวมถึงเมื่อ client อัปเดตในอนาคต |
| Add Model/Test และคำขอที่ผ่านการแปลงรูปแบบ | LP-005 | ใช้ค่าเริ่มต้น 2.1.280 ให้ตรงกันทั้ง User-Agent และ billing attribution |

LP-004 อย่างเดียวไม่ครอบคลุม Add Model เพราะคำขอนี้ไม่มี User-Agent ของ Claude Code ต้องรักษา LP-005 ด้วย ผลทดสอบ `cc/claude-opus-5-5` ผ่าน API เดียวกับปุ่ม Test ได้ HTTP 200 / `ok: true` และผู้ใช้ยืนยันว่าใช้งานได้แล้วเมื่อ 2026-09-23

เวอร์ชันซอร์สและ CLI manifest สำหรับการบันทึกรอบนี้คือ **v0.5.82** ส่วนหลักฐาน build, hash และ live validation ด้านล่างเป็นแพ็กเกจ **v0.5.81 ที่ใส่แพตช์แล้ว** ซึ่งติดตั้งและทดสอบก่อนขยับหมายเลขเวอร์ชัน

## วิธี build + install ไป global ใหม่ (ใช้ร่วมกันทุก patch หลัง re-apply)

รันจาก repository root; `cli:pack` รวมขั้น build อยู่แล้ว และวาง `.tgz` ไว้ที่ root ของ repository:

```bash
npm run cli:pack
router_version=$(node -p "require('./cli/package.json').version")
# สำรอง global install ตรวจว่าไม่มีคำขอค้าง แล้วปิด 9Router
npm install --global "./9router-${router_version}.tgz"
# เปิด 9Router ใหม่
curl --fail http://127.0.0.1:20128/api/health
```

สำรอง global install ก่อนเปลี่ยนแพ็กเกจ และตรวจว่าตัวที่รันอยู่มาจากแพ็กเกจใหม่ จากนั้นทดสอบเส้นทางที่เกิดปัญหาจริง สำหรับ LP-005 ให้ใช้ Add Model → `claude-opus-5-5` → Test (หรือ POST `/api/models/test` ด้วย `{"model":"cc/claude-opus-5-5"}` โดยใช้ dashboard/CLI authentication) ต้องได้ `ok: true` และ `status: 200`; การทดสอบโมเดลอื่นผ่าน Combo ไม่ยืนยันผลของเส้นทางนี้

---

## Patch 1: GLM-5.2 contextWindow ผิดทำให้ autocompact thrash เร็วผิดปกติ

**Commit:** `b55f405e` · **ไฟล์ที่แก้:** `open-sse/providers/capabilities.js` · **วันที่:** 2026-07-30

**v0.5.86:** ACTIVE / MODIFIED — เก็บเฉพาะ suffix lookup; provider override ด้านล่างเป็นประวัติและไม่ต้อง re-apply เพราะ upstream มี canonical GLM-5.2 1M / 131072 แล้ว ทดสอบด้วย `tests/unit/local-patch-routing.test.js`

**v0.5.91:** ACTIVE / KEPT — upstream ยังไม่ strip suffix; ยืนยัน runtime `glm-5.2(high)` → ctx 1000000

### อาการ (Bug B)

Claude Code sub-agent ที่ route ผ่าน `glm/glm-5.2(high)` ตายด้วย:
```
Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact
```
ทั้งที่ model รองรับ 1M context และใช้ไปแค่ ~117K tokens

### หลักฐานจาก log (request logs: `app/logs/`)

Context จริงที่ GLM เห็น (fresh + cache) ก่อนตาย:

```
79,101 → 93,592 → 96,558 → 97,852 → 116,582 → 117,876 tok
                          ^^^^^^^^  ^^^^^^^^
                          +19K      +39K fresh ในเทิร์นเดียว ← จุด thrash
```

ตัวการ: อ่านไฟล์ใหญ่ (เช่น `task-2-brief.md` 55 KB) เข้ามาในเทิร์นเดียว → context เติมกลับเร็วกว่า compact ตัดทิ้ง → thrash 3 รอบ → agent ถูกฆ่า

### Root cause (2 ชั้น)

**ชั้นที่ 1 — ทำไม compact เร็วผิดปกติ:**

`getCapabilitiesForModel('glm','glm-5.2')` คืน `contextWindow: 200000` ทั้งที่ GLM-5.2 จริง = 1M เพราะ:
- **ไม่มี `glm` provider block** ใน `PROVIDER_CAPABILITIES` → ตกไป pattern fallback `*glm-5*` ที่ประกาศ 200K
- **combo model id มี suffix** เช่น `glm-5.2(high)` ซึ่งไม่ match entry ใดเลย → ตก pattern tier เสมอ

Claude Code อ่าน `contextWindow` จาก `/api/models` หรือ `/v1/models/info` ไปคำนวณ autocompact:
```
ตั้ง AUTO_COMPACT_WINDOW=1M, compact ที่ 50% → ควร compact ที่ 500K
แต่ถ้าได้ window=200K → headroom = 200K − 128K(output) = 72K เท่านั้น
→ context 117K เกิน → thrash/compact เร็วผิดปกติ
```

**ชั้นที่ 2 — ทำไม context เติมเร็ว:** tool_result ยักษ์ (อ่านไฟล์ใหญ่) ผ่าน router โดยไม่ถูกจำกัด (นี่เป็นพฤติกรรมที่ตั้งใจ ไม่แก้ — ข้อมูลต้องใช้จริง)

### วิธีแก้ (2 จุดใน `open-sse/providers/capabilities.js`)

**จุดที่ 1 — เพิ่ม `glm` provider block** (ก่อน `"poolside"`):
```js
// Zhipu z.ai direct (provider alias "glm"). GLM-5.2 is 1M context / 128K output.
// Must override the `*glm-5*` pattern fallback (200K) which understates it.
"glm": {
  "glm-5.2": { reasoning: true, thinkingFormat: "zai", contextWindow: 1000000, maxOutput: 128000 },
},
```

**จุดที่ 2 — strip reasoning-effort suffix ใน `getCapabilitiesForModel`** (หลัง `const baseModel = ...`):
```js
// Strip reasoning-effort suffix used in combos: "glm-5.2(high)" -> "glm-5.2".
const stripSuffix = (m) => (typeof m === "string" ? m.replace(/\([^)]*\)\s*$/, "").trim() : m);
const lookupModel = stripSuffix(model);
const lookupBase = stripSuffix(baseModel);
```
แล้วเพิ่ม lookup ด้วย `lookupModel`/`lookupBase` ก่อน existing `model`/`baseModel` ในทั้ง provider/exact tiers

### ผลยืนยัน (ก่อน → หลัง)

| route | ก่อน | หลัง |
|---|---|---|
| `glm/glm-5.2` | ctx=200000 ❌ | ctx=1000000 ✅ |
| `glm/glm-5.2(high)` | ctx=200000 ❌ | ctx=1000000 ✅ |
| `codebuddy-cn`/`nvidia` | คงเดิม | คงเดิม ✅ (ไม่กระทบ provider อื่น) |

### วิธีเช็คว่า patch ยังอยู่หลังอัปเดต

```bash
node --input-type=module -e "
import { getCapabilitiesForModel } from './open-sse/providers/capabilities.js';
const c = getCapabilitiesForModel('glm','glm-5.2(high)');
console.log(c.contextWindow === 1000000 ? 'PATCH OK' : 'PATCH LOST — re-apply');
"
```

### วิธี build + install ไป global ใหม่ (หลัง re-apply)

ดูขั้นตอนรวมที่หัวเอกสาร — เช็คเฉพาะของ patch นี้:
```bash
grep -o '"glm-5.2":{reasoning:!0,thinkingFormat:"zai",contextWindow:1e6' \
  ~/.local/lib/node_modules/9router/app/.next-cli-build/server/chunks/*.js
```

---

## Patch 2: combo ที่มี `[1m]` suffix ไม่ resolve ทำให้ sub-agent ไม่ได้ 1M window

**Commit:** `0bb6cc65` · **ไฟล์ที่แก้:** `src/sse/services/model.js` · **วันที่:** 2026-07-30

**v0.5.91:** ACTIVE แต่ **ซ้ำกับ upstream ใน chat path** — `src/sse/handlers/chat.js:55` เรียก `stripModelContextMarker`
ตัด `[1m]` ใส่ `body.model` ก่อนถึง `getComboModels` (บรรทัด 97/172) มาตั้งแต่ v0.5.86 ดังนั้นอาการเดิม
(`9-fast-worker[1m]` → `model_not_found`) upstream ครอบคลุมแล้ว ที่แพตช์ยังกันอยู่คือ `getComboModels` อีก 2 call site
ที่ไม่ strip เอง: `src/sse/handlers/tts.js:48`, `src/sse/handlers/imageGeneration.js:50`
เก็บไว้ก่อนเพราะถอดออกเป็นการเปลี่ยน behavior ที่ไม่จำเป็นต่อ upgrade — ควรตัดสินใจถอดใน commit แยก

### อาการ

Sub-agent (ใช้ combo `9-fast-worker`) thrash ที่ ~117K ทั้งที่แก้ GLM caps แล้ว (Patch 1) และ route ไป GLM-5.2 (1M)

### Root cause

Claude Code เลือก context window จาก **model id** ไม่ใช่ capabilities ที่ router ส่ง:
- ใส่ `[1m]` ต่อท้าย id → ได้ 1M window (`9-orchestrator[1m]` ของ main session ใช้วิธีนี้)
- sub-agent ใช้ `9-fast-worker` (ไม่มี `[1m]`) → default 200K → thrash ที่ 117K

แต่ตอนลองใส่ `[1m]` ให้ combo ดันเจอว่า **`9-fast-worker[1m]` ไม่ resolve** — `getComboByName` match ตรง ๆ เลยไม่เจอ combo ชื่อนี้ → fall through ไป openai provider → `model_not_found`

### วิธีแก้ (`getComboModels` ใน `src/sse/services/model.js`)

Strip `[1m]` ออกก่อน lookup combo:
```js
const comboName = modelStr.replace(/\[\s*1m\s*\]\s*$/i, "");
const combo = await getComboByName(comboName);
```
`[1m]` เป็น client-side bookkeeping ไม่ใช่ส่วนของ combo name

### วิธีใช้ (ฝั่ง client) — **การตั้งค่าที่ถูกต้อง**

**1. เพิ่ม `CLAUDE_CODE_MAX_CONTEXT_TOKENS` ใน `~/.claude/settings.json` ⭐ (ตัวแก้จริง):**
```json
"CLAUDE_CODE_MAX_CONTEXT_TOKENS": "1000000"
```
> นี่คือ **ต้นเหตุที่ thrash ไม่หาย** — Claude Code ไม่รู้จัก `9-fast-worker` (gateway combo id) เลย hardcode window = 200K และ `AUTO_COMPACT_WINDOW=1M` ถูก clamp เหลือ 200K → `200K × 50% = 100K` = thrash threshold ที่เห็นพอดี
> `CLAUDE_CODE_MAX_CONTEXT_TOKENS` (ตั้งแต่ Claude Code v2.1.193) บอกขนาด window ของ model ที่ไม่รู้จัก → เปลี่ยนเป็น `min(1M,1M) × 50% ≈ 500K`
> อ้างอิง: GitHub issue anthropics/claude-code#68522, #46416 + docs code.claude.com/docs/en/env-vars

**2. ตั้ง tier default ใน `~/.claude/settings.json`** (ใส่ `[1m]` ได้ เพราะ env นี้รองรับ suffix บน pinned model):
```json
"ANTHROPIC_DEFAULT_SONNET_MODEL": "9-fast-worker"
```

**3. ตั้ง frontmatter ใน `~/.claude/agents/<agent>.md`** — **ใส่ bare name เท่านั้น ห้ามใส่ `[1m]`:**
```yaml
model: 9-fast-worker
```

> ⚠️ **จุดที่เคยพลาด / ข้อห้าม:**
> - **`[1m]` ใส่ใน agents/*.md frontmatter ไม่ได้** — frontmatter `model:` รับแค่ alias (`sonnet`/`opus`/`haiku`/`fable`), full claude id (`claude-opus-5`), หรือ `inherit` เท่านั้น ใส่ `9-fast-worker[1m]` แล้ว Claude Code resolve ไม่ได้ → fallback ไป default teammate model (`claude-opus-5[1m]`) ซึ่ง router route ไม่ได้ → error "There's an issue with the selected model" (เจอจริงตอน spawn teammate)
> - **`CLAUDE_CODE_MAX_CONTEXT_TOKENS` คือตัวให้ 1M window จริง** สำหรับ gateway combo id — `[1m]` ใน env เป็นแค่ทางเลือกเสริม ไม่จำเป็นถ้ามี MAX_CONTEXT_TOKENS แล้ว
> - **1M window มาจาก MAX_CONTEXT_TOKENS ไม่ใช่ `[1m]`** — ดังนั้น frontmatter ใช้ bare name ได้ปลอดภัย ไม่ต้อง `[1m]`

### ผลยืนยัน end-to-end (หลังติดตั้ง)

```
settings: ANTHROPIC_DEFAULT_SONNET_MODEL = "9-fast-worker[1m]"
ส่ง model: "9-fast-worker[1m]" → ตอบ model: "glm-5.2" (ไม่ใช่ model_not_found)
→ sub-agent ได้ 1M window + route เข้า combo ถูก
```

### วิธีเช็คว่า patch ยังอยู่

```bash
grep -q 's\*1m' ~/.local/lib/node_modules/9router/app/.next-cli-build/server/chunks/*.js \
  && echo "PATCH OK" || echo "PATCH LOST — re-apply"
# หรือยิงเทส: model "9-fast-worker[1m]" ต้องตอบ ไม่ใช่ model_not_found
```

---

## LP-003: Preserve native Claude thinking blocks

**Status:** ACTIVE · **Commit:** `b35cdcac` · **Date:** 2026-09-21

**v0.5.91 audit:** KEPT — `claude.js` ไม่ถูกแตะระหว่าง v0.5.86→v0.5.91 และ upstream ยังทิ้ง block ตาม `isValidClaudeSignature` แล้ว `unshift` placeholder (`claude.js:272,287`)

**Scope:** Claude Code native passthrough, including a single-model Combo routed to Claude.

**Root cause:** `normalizeClaudePassthrough` used an E/R-only signature heuristic. Real Opus 5 responses in the affected sessions carried `CAIS...` signatures, which the router discarded. With manual thinking enabled it inserted a hardcoded signed placeholder; with adaptive thinking it dropped the blocks. `redacted_thinking` blocks were also discarded because their opaque payload is in `data`, not `signature`.

This behavior is present in upstream snapshot `23ae82d8` (v0.5.81), not introduced by a local patch. No upstream issue/PR has been filed for LP-003.

**Change:** Native passthrough now retains all existing thinking and redacted-thinking blocks in order without parsing/replacing their signatures, including empty thinking text. It no longer fabricates a thinking block for tool-only history. Existing foreign server-tool-id cleanup remains in place. Signature authenticity, including mixed-provider history, is validated by Anthropic; this patch does not override refusals. Non-native translation paths are outside this patch.

**Files:**
- `open-sse/translator/formats/claude.js`
- `tests/unit/claude-native-thinking.test.js`

**Validation:**
- Eight regression cases through Combo → `handleChatCore` → executor failed before the fix and passed afterward (Opus 5, Fable 5, Fable 5.1; manual/adaptive/disabled thinking; redacted blocks; no fabricated signature).
- Targeted suite: 45/45 passed; ESLint and `git diff --check` passed.
- Four additional failures were reproduced on the pre-patch source: system-message hoisting expectation, an obsolete expected-failure for tool-result images, gotScraping routing expectation, and empty Read pages response-delta expectation.
- The actual Opus signature from an affected transcript is preserved in both manual and adaptive modes after the fix. Private signatures are not committed as fixtures.
- `npm run cli:pack` passed; the packaged normalizer was checked directly and preserves opaque/redacted blocks.
- Installed the local v0.5.81 package and restarted after confirming no active requests. `/api/health` returned `{"ok":true}`; the installed chunk hash matches the tested package and its normalizer preserves opaque/redacted blocks.
- Package SHA-256: `7b2c7bcfe9150c438c8fa3fae1897c3ad3852c61238eb921df4b9707d1b76740`.
- Pre-install application backup: `/tmp/9router-before-LP003-20260921/9router` (temporary local rollback copy; provider data and Combo settings remain in `~/.9router`).
- Live post-install Claude Code probe through `9-orchestrator` → `claude-opus-5`: two sequential Read calls and a final answer, three distinct model responses, exit 0, no refusal. Used the normal settings/hooks with built-in tools restricted to Read.
- Fable 5.1 live probes (normal and minimal context) were blocked by upstream HTTP 429, surfaced by the router as 503. No live Fable success is claimed; its request-preservation regression cases passed locally.

**Acceptance limit:** Fixes a demonstrated protocol corruption. The intermittent `[reasoning_extraction]` refusal was not reproduced by the earlier minimal live probes, so this patch alone is not evidence that every refusal is resolved.

**Upstream upgrades:** Preserve this patch until the native passthrough path keeps opaque thinking/redacted blocks unmodified and no longer inserts synthetic signed placeholders. Do not decide from release notes alone.

Reference: https://platform.claude.com/docs/en/about-claude/models/extended-thinking-models

---

## LP-004: Preserve the actual Claude Code client version

**Status:** ACTIVE · **Commit:** `ac47e8b7` · **Date:** 2026-09-23

**v0.5.91 audit:** KEPT (rebased ผ่าน conflict) — v0.5.91 `default.js` ไม่อ่าน `rawHeaders["user-agent"]` เลย ยังทับ UA ด้วย `CLAUDE_CLI_VERSION` คงที่ แพตช์ถูก rebase ให้ใช้ `isClaudeUpstream` ร่วมกับ logic `mergeAnthropicBeta` + session-id ใหม่ของ upstream

**Scope:** Incoming Claude Code requests routed to the `claude` provider or a Claude model on an `anthropic-compatible-*` provider.

**Symptom:** Upstream reports `claude_code_version_too_old`, naming 2.1.258 and requiring 2.1.280, even though the installed Claude Code is already 2.1.280. Restarting the router does not update the compiled header default.

**Root cause:** `DefaultExecutor.buildHeaders` overwrote the incoming User-Agent with the provider's static `CLAUDE_CLI_VERSION` (2.1.258). This behavior is present in upstream snapshot `23ae82d8` (v0.5.81), not introduced by LP-003. No upstream issue/PR has been filed for LP-004.

**Change:** Preserve the incoming Claude Code User-Agent, including its actual version, for Claude upstreams. An older client continues to identify as older; a future client does not require another pinned-version update. Keep provider authentication, non-Claude routes, and non-Claude-client defaults unchanged. The existing native path preserves the client's billing attribution block. This patch does not change upstream model/version eligibility checks or refusals.

**Files:**
- `open-sse/executors/default.js`
- `tests/unit/claude-client-version.test.js`

**Validation:**
- Five regression cases failed before the fix, including Combo → `handleChatCore` → real executor → mocked fetch for Opus 5 and Fable 5.1, demonstrating 2.1.280 being replaced by 2.1.258.
- All nine new cases passed after the fix; 54/54 targeted tests passed including LP-003, plus 17/17 existing executor header cases. The unrelated proxy transport cases were excluded; one has a previously confirmed baseline failure.
- ESLint, `git diff --check`, and `npm run cli:pack` passed.
- The packaged and installed executors both preserve the supplied client version. Installed executor chunk SHA-256 matches the tested build: `4f5eae3f7e4cbf4c129e25034e92f90a96f265f011c8c7ed6d2fe892a3287096`.
- Package SHA-256: `eb3eadb467d52cd97e98209d8ccc78cedaa9afb32166112d49495a70fc6ba4d9`.
- Installed local v0.5.81 and restarted after checking zero active requests; `/api/health` returned `{"ok":true}`, with a new listener process.
- Pre-install backup: `/tmp/9router-before-LP004-20260923/9router` (temporary local rollback copy).
- Live post-install Claude Code 2.1.280 probe through `9-orchestrator` completed successfully, with three distinct Opus 5 responses and a final answer containing both package versions. No Kimi fallback was observed.
- Fable 5.1 returned an upstream `[cyber]` refusal in the minimal probe both before and after installation. No Fable completion success is claimed; this is distinct from the minimum-version HTTP 400.

**Acceptance limit:** The reported minimum-version HTTP 400 did not reproduce in the minimal pre-install CLI probes. The user later clarified that it occurred in the dashboard Add Model test for Opus 5.5; LP-005 reproduces and fixes that separate path. Header corruption was reproduced deterministically and corrected by LP-004; successful Opus 5 CLI calls alone do not validate dashboard probes or Opus 5.5.

**Upstream upgrades:** Retain until the upstream executor preserves the actual incoming Claude Code version. Merely increasing `CLAUDE_CLI_VERSION` leaves the next client update vulnerable to the same mismatch.

---

## LP-005: Opus 5.5 in the dashboard Add Model test

**Status:** UPSTREAM_FIXED · **Original commit:** `83bda598` · **Date:** 2026-09-23 · **Fixed upstream:** `cbffeb97` (included in v0.5.86)

**v0.5.91 audit:** UPSTREAM_FIXED ยังเป็นจริง — `shared.js:25` = `CLAUDE_CLI_VERSION = "2.1.280"`

**Scope:** Dashboard Add Model/Test and other translated requests without an incoming Claude Code identity. Complements LP-004, which only forwards an existing native client User-Agent.

**Root cause:** `AddCustomModelModal` calls `/api/models/test`; `pingModelByKind` then sends an OpenAI-format request to internal chat completions without a Claude Code User-Agent. Both the provider's default User-Agent and the generated billing attribution therefore used the static `CLAUDE_CLI_VERSION = "2.1.258"`. Opus 5.5 rejects this version and requires 2.1.280. Restarting does not update a compiled constant. The default comes from upstream snapshot `23ae82d8`, not a local patch. LP-004's earlier Opus 5 CLI probe did not cover this dashboard path or Opus 5.5.

**Change:** Update the shared compatibility default to 2.1.280 so the generated User-Agent and billing attribution agree. Native Claude Code requests still retain their actual version, including older clients. The default remains a maintained compatibility value and may need updating when upstream requirements change; this patch does not infer it from a locally installed executable.

**Files:**
- `open-sse/providers/shared.js`
- `tests/unit/claude-client-version.test.js`
- `tests/unit/claude-cloaking.test.js`
- `tests/unit/claude-header-forwarding.test.js`

**Validation:**
- Before the fix, an authenticated POST to the actual `/api/models/test` endpoint with `{"model":"cc/claude-opus-5-5"}` reproduced the exact HTTP 400 `claude_code_version_too_old`, reporting 2.1.258 and requiring 2.1.280.
- A regression test using the dashboard's OpenAI-format request through `handleChatCore`, translation and the real executor failed on both the outbound User-Agent and billing version before the fix. It passes after the change.
- 66/66 targeted tests plus 17/17 existing executor header cases passed (83 total). Tests cover model probing, native version forwarding and LP-003 thinking preservation. Unrelated proxy transport cases were excluded, as in LP-004.
- ESLint, `git diff --check`, and `npm run cli:pack` passed. Packaging required sandbox escalation to access the existing npm cache; no cache ownership changes were made.
- The compiled package was checked directly: default User-Agent and billing version are 2.1.280; a native 2.1.100 User-Agent remains unchanged.
- Installed and restarted after confirming zero active requests. `/api/health` returned `{"ok":true}`; all installed server chunks match the tested build, ID `UL94RM1fRuEoRY3XL_4Z5`.
- Package SHA-256: `7960811fe1397de0598cf7876cfd29acc6c3da0010940f27a75453293828b2c0`.
- Pre-install backup: `/tmp/9router-before-LP005-20260923/9router` (temporary local rollback copy).
- The identical post-install Add Model test returned `{"ok":true,"latencyMs":2449,"error":null,"status":200}` for `cc/claude-opus-5-5`. This is a direct model probe, not a Combo fallback.
- User acceptance on 2026-09-23: confirmed the Add Model operation now works after installing LP-005.

**Upstream tracking:** Fixed by `cbffeb97`: the shared default is 2.1.280, used by both generated headers and billing attribution. As of v0.5.86, `open-sse/providers/shared.js` matches upstream and no separate LP-005 implementation remains. Keep its regression coverage and preserve LP-004's native passthrough separately.

---

## LP-006: Gemini tool-schema annotations (registered retrospectively)

**Status:** ACTIVE · **Commit:** `c31f4070` · **Implemented:** 2026-09-20 · **Registered:** 2026-09-24

**v0.5.91 audit:** KEPT — v0.5.91 `gemini.js` ไม่มี `errorMessage` (0 hit) และ `removeUnsupportedKeywords` ยังไม่มี `isPropertyMap`

**Root cause:** Gemini/Antigravity reject schema annotations such as `errorMessage` and `errorMessages`. The old recursive cleaner also treated keys under `properties` as schema keywords, deleting legitimate parameters named `errorMessage`, `title`, or `format`.

**Change:** Strip unsupported annotations recursively while preserving actual property names. Applies to the shared Gemini schema cleaner; provider credentials and prompts are unchanged.

**Files:** `open-sse/translator/formats/gemini.js`, `tests/unit/gemini-schema-clean-errormessage.test.js`.

**v0.5.86 audit:** KEPT. Neither fix exists in upstream `39e36d3d`. Four existing regression tests pass, including OpenAI tool → Gemini function declarations. No upstream issue/PR has been filed for this local patch.

---

## LP-007 / LP-008 / LP-009: ยอด cost ของ gpt-6 (และ gpt-5.6 sol/luna/terra) ไม่ขึ้น

**Status:** ACTIVE · **Commits:** `1df544ca`, `99ec5852`, `b6298d96` (+ test `5c34ee8f`) · **Implemented:** 2026-09-28

**อาการ:** แดชบอร์ด Usage by Model แสดง `gpt-6-astra-medium` / `gpt-6-sol-high` เป็น `$0.00` ทุกคอลัมน์ ทั้งที่ token บันทึกครบ — รวม 16,723 request คิดเงินหายไป ~$2,784

**Root cause:** `getPricingForModel()` คืน `null` แล้ว `usageRepo.calculateCost` เก็บ `cost = 0` ลง DB แบบเงียบๆ เหตุเพราะ
1. `MODEL_PRICING` มี key เดียวของทั้งตระกูล คือ `"gpt-6-astra"` (ไม่มี `gpt-6-sol` / `gpt-6-luna` เลย) และ `PATTERN_PRICING` หยุดที่ `gpt-5.6-*` ไม่มี glob `gpt-6*`
2. suffix `-low/-medium/-high/-xhigh` เป็น **client-facing id** — `open-sse/executors/codex.js` ตัดทิ้งเฉพาะตอนยิง upstream แต่ usage record เก็บ id เต็ม → lookup ไม่เจอ
3. `gpt-5.6-sol-high` ตก wildcard `gpt-5.6-*` (2.50/15) แทนเรต sol จริง → คิดเงินต่ำไปครึ่งหนึ่งมาตลอด

**หลักฐานชี้ขาด:** วันเดียวกัน provider เดียวกัน ต่างแค่ suffix — `2026-09-09` `gpt-6-astra` 629 req = $106.81 แต่ `gpt-6-astra-high` 218 req = $0.00

**Change:**
- LP-007 — เรตตระกูล gpt-6 ตาม <https://developers.openai.com/api/docs/pricing>: astra 10/1/50, sol 2/0.20/10, luna 0.10/0.01/0.50 ($/1M in/cached/out) **ของเดิม astra 5/30 ก็ผิด**
- LP-008 — เพิ่ม step 5 ใน `getPricingForModel()`: ถ้าไม่เจอเลย ให้ตัด `-<level>` หรือ `(level)` ท้ายแล้ว resolve ใหม่ (effort เปลี่ยนจำนวน token ไม่ใช่เรตต่อ token) **วางท้ายสุดโดยเจตนา** — ยิงเฉพาะเคสที่เดิมคืน null จึงไม่แตะ tier `*-codex-high`/`*-codex-low` ที่แมตช์ pattern ไปก่อน แก้ `k3(max)` ของ kimi ให้ด้วย
- LP-009 — เพิ่ม pattern `gpt-5.6-sol-*` / `-terra-*` / `-luna-*` เหนือ `gpt-5.6-*` และแก้เรตฐาน sol 4/0.40/20, terra 2/0.20/12, luna 0.20/0.02/1.20 (รวม `PROVIDER_PRICING.tokenrouter["openai/gpt-5.6-sol"]`)

**Files:** `open-sse/providers/pricing.js`, `tests/unit/pricing-effort-suffix.test.js`

**⚠️ เช็คตอน upgrade รอบหน้า:**
- ถ้า upstream เพิ่ม glob `gpt-6*` เข้า `PATTERN_PRICING` → **LP-008 จะถูกบายพาส** เพราะ pattern แมตช์ที่ step 4 ก่อน step 5 ต้องตรวจว่า `gpt-6-astra-high` ยังได้เรต astra (10/50) ไม่ใช่เรตรวม
- ถ้า upstream แก้ `getPricingForModel` ให้ strip suffix เอง → LP-008 = `UPSTREAM_FIXED` (แต่ต้องดูว่า upstream วางไว้ก่อนหรือหลัง pattern — ถ้าวางก่อน `*-codex-high` จะ regress)
- LP-007/LP-009 เป็น **ตัวเลขที่ upstream เป็นคนใส่** → conflict ทุกครั้งที่ upstream แตะ pricing **ห้ามเชื่อ changelog** ให้ diff กับหน้า pricing ทางการจริงทุกรอบ
- รัน `npx vitest run unit/pricing-effort-suffix.test.js` เป็น gate — เทสมีทั้งฝั่ง "ต้องแก้" และ "ห้าม regress"

---

## LP-010: ไม่มี pricing entry แล้วเงียบ

**Status:** ACTIVE · **Commit:** `d09abdcb` · **Implemented:** 2026-09-28

**Root cause:** `calculateCost()` ใช้ `if (!pricing) return 0;` เฉยๆ → model ที่ไม่มีเรต หน้าตาเหมือน model ฟรีเป๊ะ นี่คือเหตุผลที่ LP-007 ซ่อนอยู่ได้หลายสัปดาห์โดยไม่มีอะไรเตือน

**Change:** warn หนึ่งครั้งต่อ `provider|model` ต่อ process (dedupe ด้วย `Set`) log แค่ชื่อ provider/model ไม่มี apiKey หรือ token

**Files:** `src/lib/db/repos/usageRepo.js`

**เช็คตอน upgrade:** เป็นบล็อกเล็กใน `calculateCost` ถ้า upstream เขียนฟังก์ชันนี้ใหม่ให้ re-apply — แต่ถ้า upstream มี logging ของตัวเองแล้วให้ถือเป็น `UPSTREAM_FIXED`

---

## LP-011: เทสเขียนทับ DB จริงของ gateway ⚠️

**Status:** ACTIVE · **Commit:** `594fcba0` · **Implemented:** 2026-09-28

**อาการที่ผู้ใช้เจอ:** provider **Zed** โผล่ในแดชบอร์ดพร้อม "1 Connected" ทั้งที่ลบไปแล้ว — และเคยเกิดมาก่อนหน้านี้ด้วย

**Root cause:** `src/lib/dataDir.js` fallback ไป `~/.9router` เมื่อไม่ได้ตั้ง `DATA_DIR` → เทสไฟล์ไหนที่แตะ db layer โดยไม่ isolate ตัวเอง **จะเขียนลง DB ของ gateway ที่รันอยู่จริง** แค่รัน `npx vitest run` ตามที่ CLAUDE.md เขียนไว้ ก็ได้
- `tests/unit/zed-native-auth.test.js` → connection `zed` ปลอม 2 แถว (`accessToken: "decrypted-token-xy…"`)
- `tests/unit/provider-priority-insert-cost.test.js` → `openai-compatible-*` fixture ~143 แถว

`zed-native-auth.test.js:2` **เขียน comment ไว้แล้ว** ว่า `RUN WITH AN ISOLATED DB: DATA_DIR=$(mktemp -d) …` แต่ไม่มีอะไรบังคับ

**Change:** ตั้ง `test.env.DATA_DIR` เป็น `mkdtempSync()` ต่อหนึ่งรอบรันใน `tests/vitest.config.js` → ไม่ต้องพึ่งวินัยรายไฟล์อีก ไฟล์ที่ตั้ง `DATA_DIR` เองยัง override ได้ตามเดิม

**ล้างข้อมูลที่ปนเปื้อนแล้ว (2026-09-28):** ลบ 145 แถวจาก `providerConnections` (`createdAt >= 2026-09-28T10:40:21` และ provider เป็น `zed` หรือ `openai-compatible-%`) เหลือ connection จริง 9 แถว
สำรองก่อนลบไว้ที่ `~/.9router/db/backups/data.sqlite.pre-fixture-cleanup-20260928-174351`
ตรวจแล้วว่าตารางอื่นไม่โดน — `usageHistory`, `providerNodes`, `apiKeys`, `combos`, `proxyPools` สะอาด

**Files:** `tests/vitest.config.js`

**⚠️ เช็คตอน upgrade — สำคัญที่สุดในไฟล์นี้:** ถ้า upstream เขียน `tests/vitest.config.js` ทับแล้ว `env.DATA_DIR` หาย **การรันเทสครั้งถัดไปจะเขียน DB จริงอีก** วิธีตรวจเร็ว:

```bash
sqlite3 ~/.9router/db/data.sqlite "SELECT COUNT(*) FROM providerConnections;"   # ก่อนรันเทส
cd tests && npx vitest run unit/zed-native-auth.test.js unit/provider-priority-insert-cost.test.js
sqlite3 ~/.9router/db/data.sqlite "SELECT COUNT(*) FROM providerConnections;"   # ต้องเท่าเดิม
```

---

## LP-012: สคริปต์ backfill ยอด cost ย้อนหลัง

**Status:** ACTIVE · **Commit:** `cc176d22` · **Implemented:** 2026-09-28

**เหตุผล:** cost ถูกคำนวณ **ตอนเขียน** (`usageRepo.saveRequestUsage`) แล้วเก็บลงคอลัมน์ `usageHistory.cost` พร้อม pre-aggregate ลง `usageDaily.data` ฝั่งอ่านแค่ `SUM()` ไม่คำนวณใหม่ → LP-007/008/009 มีผลกับ request ใหม่เท่านั้น ยอดเก่าต้อง backfill แยก

**Change:** `scripts/backfill-usage-cost.mjs` — dry-run เป็น default, `--apply` ถึงเขียนจริง คำนวณ delta ต่อแถวแล้วบวกกลับเข้า **ครบทั้ง 6 ช่อง cost** ของ `usageDaily` (`cost`, `byProvider`, `byModel`, `byAccount`, `byApiKey`, `byEndpoint`) ใน transaction เดียวแบบ `BEGIN IMMEDIATE` (กัน server ที่รันอยู่แทรก write ระหว่าง read→write ของ day blob แล้วโดนทับหาย)

import resolver + สูตรคิดเงินจาก `open-sse/providers/pricing.js` **ห้ามเขียนสูตรซ้ำ** และต่อ SQLite ตรงๆ เพราะสาย `src/lib/db/driver.js` ใช้ alias `@/` ที่ node เปล่ารันไม่ได้

`getLocalDateKey` ย้ายออกมาเป็น `src/lib/db/helpers/dateKey.js` เพื่อให้ write path กับสคริปต์แบ่งวันเหมือนกันเป๊ะ (เป็น **local time ไม่ใช่ UTC** — ถ้า copy แล้ว drift จะทำให้วันเดียวแตกเป็นสอง key)

**Files:** `scripts/backfill-usage-cost.mjs`, `src/lib/db/helpers/dateKey.js`, `src/lib/db/repos/usageRepo.js`

**วิธีใช้:** ต้องหยุด server ก่อน (in-memory ring จะค้างของเก่า) และสำรอง DB
```bash
node scripts/backfill-usage-cost.mjs                      # dry-run
node scripts/backfill-usage-cost.mjs --apply
node scripts/backfill-usage-cost.mjs --provider kimi --model 'k3%' --zero-only
```

**เช็คตอน upgrade:** ถ้า `aggregateEntryToDay` ของ upstream เพิ่ม/เปลี่ยน bucket ต้องแก้ `bucketKeys()` ในสคริปต์ให้ตรงกัน ไม่งั้น backfill จะทำให้ยอดรวมกับยอดย่อยไม่ตรง

---

## LP-013: Muse Spark ปฏิเสธ tool schema ที่ซ้อนลึกเกิน 10 ชั้น

**Status:** ACTIVE · **Commit:** `ba910b94` · **Implemented:** 2026-09-29

**อาการ:** sub-agent `fast-worker` (combo `9-fast-worker` → `ocg/muse-spark-1.3-contributor(max)`) ล้มทันทีด้วย `400 JSON schema exceeds the maximum nesting depth of 10 levels` (`param: parameters`) เมื่อ client ส่ง MCP tool ที่ schema ลึก (เช่น Vercel `update_firewall_config`, `create_sandboxes_*`) — request ทั้งก้อนพังทุก account

**Root cause:** backend ของ Muse Spark จำกัดความลึกของ tool `parameters` ไว้ 10 ชั้น ส่วน 9router ส่ง schema ไปตามเดิมโดยไม่ตรวจ วัดจริง (2026-09-29) ได้กฎการนับดังนี้: 1 ชั้น = node ที่มี `properties`/`items` (นับ root ด้วย), `anyOf`/`oneOf`/`allOf` และ `additionalProperties` ไม่นับ, `$ref` ภายในถูก resolve ก่อนนับ, leaf `{type:"object"}` ที่ไม่มี `properties` ผ่าน

**Change:** `open-sse/utils/museSparkToolSchema.js` (`capToolSchemasDepth`) — ถ้า schema ลึกเกิน จะ inline `$ref` ภายใน, ตัด `$defs`/`definitions` และยุบ node ที่เกินชั้นที่ 10 ให้เหลือ leaf ที่ยังเก็บ `type`/`description` (ต่อท้ายด้วย "nested fields omitted") ส่วน `$ref` ที่วนกลับหาตัวเองจะถูกยุบที่รอบที่สอง ถ้า schema ไม่เกิน limit จะคืน reference เดิมโดยไม่แตะเลย
เรียกเฉพาะเมื่อ `isMuseSparkModel(model)` ใน executor ทั้ง 3 ตัวที่เสิร์ฟ Muse (`opencode-go`, `opencode-zen`, `opencode` free) **model อื่นไม่ถูกแตะ**

**Files:** `open-sse/utils/museSparkToolSchema.js`, `open-sse/executors/opencode-go.js`, `open-sse/executors/opencode-zen.js`, `open-sse/executors/opencode.js`, `tests/unit/muse-spark-tool-schema-depth.test.js`

**Validation:** unit 8/8 ผ่าน, full suite ไม่มีเทสใหม่ที่ fail (เทียบกับรันแบบ stash: fail 97 เท่าเดิม — `verify-no-regression.mjs` baseline ใช้ไม่ได้ ชื่อเทสออกมาเป็น `undefined`); live กับ upstream: schema ดิบ (object 14 ชั้น, array+anyOf 13 ชั้น, `$defs` 14 ชั้น, `$ref` วนตัวเอง) ได้ 400 ทั้งหมด → หลัง cap ได้ 200 ทั้งหมด

**เช็คตอน upgrade:** ถ้า upstream เพิ่ม depth/schema sanitizer ของ Muse Spark เอง หรือ Muse ขยาย limit ให้ประเมินว่า patch นี้ยังจำเป็นไหม; ถ้า upstream แยก `normalizeResponsesTools` ออกเป็น helper ร่วม ต้องย้ายการเรียก `capToolSchemasDepth` ตามไปด้วย

---

## Patch ที่ยังไม่ได้แก้ (รอตัดสินใจ)

### Bug A: `reason` injection ใน tool schema ว่าง (gemini/antigravity path)

**สถานะ:** NEEDS_REVIEW — ประเด็นเดิมที่ยังไม่ได้แก้ · **ไฟล์:** `open-sse/translator/formats/gemini.js`, `cleanJSONSchemaForAntigravity()`

**ตรวจซ้ำ v0.5.91 (2026-09-28):** ยังเหมือนเดิมทุกอย่าง — `cleanJSONSchemaForAntigravity({type:"object",properties:{}})` คืน `properties.reason` + `required:["reason"]` (`gemini.js:401,406,413,418`) upstream ไม่แก้ในรอบนี้

**ตรวจซ้ำ v0.5.86 (2026-09-24):** การเรียก cleaner ด้วย `{type: "object", properties: {}}` ยังได้ `properties.reason` และ `required: ["reason"]`; ยืนยันได้ในระดับ schema transformation รอบนี้ ไม่ได้รัน live Gemini tool-call เพื่อยืนยัน error ฝั่ง Claude Code ซ้ำ ควรแยกแก้และทดสอบ empty-tool round-trip ก่อนปิดประเด็น

- `cleanJSONSchemaForAntigravity` ฝัง `reason` เป็น **required** field ลง tool ที่ schema ว่าง (เช่น `TaskList`)
- model เห็น schema บอก `reason` required → ส่ง `{"reason":"..."}` กลับมา
- ฝั่ง response (`openai-to-claude.js`) ไม่ strip → Claude Code ตีตก `InputValidationError: unexpected parameter 'reason'`

**ทางแก้ที่เลือกไว้:** ตัด `obj.required = ["reason"]` (ทำให้เป็น optional) หรือ strip `reason` ตอน response
**หมายเหตุ:** upstream v0.5.45 ขยาย injection ให้ครอบคลุม schema ว่าง `{}` มากขึ้น (commit `e3e3e235`) — bug ยังอยู่และกว้างขึ้น
