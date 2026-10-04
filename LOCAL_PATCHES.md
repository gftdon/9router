# Local Patches — สิ่งที่แก้เองนอกเหนือจาก upstream

> เอกสารนี้บันทึก patch ที่เราแก้เองบน fork (`gftdon/9router`) แต่ยังไม่ได้ขึ้น upstream (`decolua/9router`)
> **ทุกครั้งที่อัปเดต 9router เวอร์ชันใหม่ ให้เช็คไฟล์นี้ก่อน** — ถ้า patch ถูกเขียนทับ ให้ re-apply ตามขั้นตอนด้านล่างของแต่ละเคส

## สถานะปัจจุบัน (อัปเดต 2026-10-03)

| รายการ | ค่า |
|---|---|
| Upstream base | `v0.5.95` (`a99cf572`) — merge `c3deacad`; `upstream/master` ยังเท่ากับ v0.5.95 ตอนตรวจ |
| `origin/master` (`gftdon/9router`) | push ครบถึง LP-033 + เอกสาร |
| Build ที่ติดตั้ง global | `9router-0.5.95.tgz` จาก commit `4766c640` (LP-017..LP-033 + drawer 75% + Sessions date-window) — ติดตั้ง 2026-10-03 20:22 |
| Server ที่รันอยู่ | LaunchAgent `com.9router.autostart` (`cli.js --tray --skip-update --log`, log `~/.9router/logs/server.log` ตาม LP-034) — start 2026-10-03 20:22 (bootout + bootstrap) |
| Request logs | ปิดอยู่ — logs เดิมลบหมดแล้ว (2026-10-03 หลังทดสอบ LP-023..LP-025) เปิดใหม่ด้วย `ENABLE_REQUEST_LOGS=true 9router` เมื่อต้องดีบัก (เก็บ `x-api-key` แบบ plaintext) |
| ค้างตรวจ | — (เรื่อง error กลาง stream ของ Responses upstream แก้แล้วใน LP-031) |
| LP-021 | ติดตั้งแล้ว (build จาก `2735ef3a`) และยืนยัน live กับ Claude Code จริงแล้ว (2026-10-03) — signature ที่ไม่ว่างของ kimi แก้ด้วย LP-022 |

## สรุป patch ทั้งหมด (ตามลำดับ commit)

| Commit | ไฟล์ที่แก้ | แก้อะไร | สถานะ |
|---|---|---|---|
| `b55f405e` | `open-sse/providers/capabilities.js` | Patch 1: เหลือเฉพาะ strip effort suffix; ใช้ GLM-5.2 limits จาก upstream | ACTIVE / MODIFIED (v0.5.95 — ผ่าน `refine()` ของ upstream) |
| `0bb6cc65` | `src/sse/services/model.js` | Patch 2: strip `[1m]` suffix ตอน resolve combo name | ACTIVE / REDUNDANT-สำหรับ chat path (v0.5.95) |
| `c31f4070` | `open-sse/translator/formats/gemini.js` | LP-006: strip schema annotations โดยรักษาชื่อ property จริง (เพิ่มทะเบียนย้อนหลัง) | ACTIVE / KEPT (v0.5.95) |
| `b35cdcac` | `open-sse/translator/formats/claude.js` | LP-003: preserve native Claude thinking blocks and opaque signatures | ACTIVE / KEPT (v0.5.95) |
| `ac47e8b7` | `open-sse/executors/default.js` | LP-004: forward the actual Claude Code client version | ACTIVE / KEPT (v0.5.95) |
| `83bda598` | `open-sse/providers/shared.js` | LP-005: update the dashboard compatibility default for Opus 5.5 | UPSTREAM_FIXED (`cbffeb97`) |
| `26267bb5` | `open-sse/executors/muse.js` | LP-036: ส่ง `prompt_cache_key` (จาก session ของ client) ให้ Muse — เดิม cache หลุด 0% เกือบครึ่งของ request | ACTIVE (commit แล้ว ยังไม่ deploy) |
| `63a96737` | `open-sse/utils/streamHandler.js` | LP-035: บรรทัด `STALL TIMEOUT … chunks/bytes/sinceLast` พิมพ์เสมอ (เดิมผ่าน `dbg()` ที่ทำงานเฉพาะ dev) | ACTIVE (commit แล้ว ยังไม่ deploy) |
| — (นอก repo) | `~/Library/LaunchAgents/com.9router.autostart.plist`, `~/Library/LaunchAgents/com.9router.logrotate.plist`, `~/.9router/bin/rotate-logs.sh` | LP-034: เปิด `--log` ให้ server เขียน console log ลง `~/.9router/logs/server.log` + หมุน log รายชั่วโมง (เดิม output ของ server ถูกทิ้ง) | ACTIVE (apply + ยืนยัน live แล้ว) |
| `f356ce30` | `src/app/(dashboard)/dashboard/usage/page.js` | LP-033: แท็บ Usage ค้างเมื่อ hard-load ด้วย `?tab=` → ใช้ `history.pushState` แทน `router.push` (บั๊ก upstream เดิม) | ACTIVE (deploy แล้ว) |
| `79698992` | `open-sse/handlers/chatCore.js` (+3 handlers, `requestDetail.js`), `open-sse/utils/sessionManager.js`, `src/lib/db/{schema.js,repos/usageRepo.js}`, `usage/page.js` + ไฟล์ใหม่ `src/lib/usage/sessionUsage.js`, `/api/usage/sessions`, `SessionsTab.js` | LP-032: บันทึก Session ID ของ client ลง `usageHistory` + แท็บ Usage › Sessions (ยอดรวมต่อ session, Detail แยกต่อ model) | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `baedc557` | `open-sse/transformer/streamToJsonConverter.js`, `open-sse/handlers/chatCore/sseToJsonHandler.js` | LP-031: Responses upstream ส่ง `event: error` / `response.failed` หลัง HTTP 200 → client non-stream ได้ error (429 สำหรับ rate limit, 502 อื่นๆ) แทน 200 ว่าง เพื่อให้ account/combo fallback | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `df7999a5` | `open-sse/executors/muse.js` | LP-028: ย้าย effort เข้า `reasoning` เมื่อ Responses body มี `input` เป็น string (แก้ LP-018) | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `6a389c60` | `open-sse/handlers/chatCore.js` | LP-029: provider ที่ forceStream แต่ตอบ JSON ธรรมดา → ใช้ handler non-stream แทนการห่อ JSON เป็น SSE | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `cb1a19d1` | `open-sse/handlers/chatCore.js` | LP-030: upstream รูปแบบ Responses ที่ส่ง SSE ให้ client non-stream → แปลงด้วย SSE→JSON handler (เดิมได้ chat.completion ว่าง) | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `d58788ff` | `open-sse/providers/thinkingLevels.js` | LP-027: ระดับ effort ของ muse-spark บน `opencode-go` = minimal…max (เดิม `ocg/…(max)` ถูกตัดเหลือ xhigh) | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `09c1e5a9` | `open-sse/translator/formats/gemini.js`, `concerns/schemaPlaceholder.js`, `response/gemini-to-openai.js`, `chatCore/nonStreamingHandler.js`, `utils/stream.js`, `executors/antigravity.js` | LP-026 (เดิม Bug A): placeholder `reason` ของ schema ว่างเป็น optional + ตัดออกจาก tool call ที่ส่งกลับ client | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `1df544ca` | `open-sse/providers/pricing.js` | LP-007: เรตตระกูล gpt-6 ตามราคาทางการ OpenAI | UPSTREAM_FIXED (`92c7bdd5`, v0.5.95) |
| `99ec5852` | `open-sse/providers/pricing.js` | LP-008: resolve ราคาเมื่อ model id มี effort suffix | ACTIVE / KEPT (v0.5.95) |
| `b6298d96` | `open-sse/providers/pricing.js` | LP-009: gpt-5.6 sol/luna/terra ไม่ตก wildcard + เรตตรงทางการ | ACTIVE / MODIFIED (v0.5.95 — upstream ใส่เรตผิด; cache write → 1.25x ตามทางการ) |
| `d09abdcb` | `src/lib/db/repos/usageRepo.js` | LP-010: warn เมื่อไม่มี pricing entry (เลิกเงียบ) | ACTIVE / KEPT (v0.5.95) |
| `594fcba0` | `tests/vitest.config.js` | LP-011: บังคับ DATA_DIR แยกตอนรันเทส (กัน DB จริงโดนเขียน) | ACTIVE / KEPT (v0.5.95) |
| `cc176d22` | `scripts/backfill-usage-cost.mjs`, `src/lib/db/helpers/dateKey.js` | LP-012: สคริปต์ backfill ยอด cost ย้อนหลัง | ACTIVE / KEPT (v0.5.95) |
| `ba910b94`, `d0da91c0` | `open-sse/utils/museSparkToolSchema.js`, `open-sse/executors/{opencode,opencode-go,opencode-zen,muse}.js` | LP-013: จำกัดความลึก tool schema ≤10 ชั้น เฉพาะ Muse Spark | ACTIVE / KEPT (v0.5.95) |
| `7fd7ee12`, `d48c12c8` | `open-sse/providers/registry/codex.js`, `open-sse/providers/pricing.js` | LP-014: bump Codex CLI identity → 0.159.0 + เพิ่ม gpt-6.1-sol | UPSTREAM_FIXED (`ca6e8407`, `dec820b9`, v0.5.95) |
| `c85dc41e` | `open-sse/config/grokCli.js` (+7 ไฟล์) | LP-015: backport upstream `6b9dc54d` — Grok CLI identity 0.2.99 → 1.0.44 (แก้ HTTP 426) | UPSTREAM_FIXED (`6b9dc54d` อยู่ใน v0.5.95 แล้ว) |
| `8f7c6cde` | `open-sse/handlers/chatCore/{sseToJsonHandler,nonStreamingHandler,claudeMessageBody}.js` | LP-016 (เดิม Bug C): `/v1/messages` + `stream:false` บน provider ที่บังคับ stream คืน Anthropic `message` แทน chat.completion | ACTIVE / KEPT (v0.5.95) |

| `010d2460` | `open-sse/handlers/chatCore.js` | LP-017: เลือก transport ตาม targetFormat ของ model เมื่อไม่มี transport ตรงกับ client (muse ยิงผิด URL → 400 `unknown parameter input`) | ACTIVE |
| `f2d5bba4` | `open-sse/executors/muse.js`, `open-sse/executors/index.js` | LP-018: MuseExecutor ย้าย `reasoning_effort` → `reasoning.effort` บน /v1/responses | ACTIVE |
| `d0da91c0` | `open-sse/executors/muse.js` | LP-013 (ขยาย): จำกัดความลึก tool schema ให้ provider `muse` ตรงด้วย | ACTIVE |
| `db547565` | `open-sse/providers/thinkingLevels.js` | LP-019: ระดับ effort ของ muse-spark บน `muse` = minimal…max (เดิม max ถูกตัดเหลือ xhigh) | ACTIVE |
| `b528c903` | `open-sse/providers/registry/muse.js` | LP-020: `forceStream: true` ให้ muse — `stream:false` เคยได้ chat.completion ว่าง | ACTIVE |
| `2735ef3a` | `open-sse/translator/formats/claude.js` | LP-021: ทิ้ง thinking block ที่ไม่มี signature ก่อนส่ง Claude (แก้ 400 `Invalid signature`) — ปรับจาก LP-003 | ACTIVE (deploy + ยืนยัน live แล้ว; ไม่ครอบคลุม signature ของ kimi → LP-022) |
| `5c96c99e`, `4e8d2f28` | `open-sse/handlers/chatCore.js`, `open-sse/translator/formats/claude.js` | LP-022 (เดิม Bug E): Claude 400 `Invalid signature` → retry 1 ครั้งโดยตัด thinking ออก | ACTIVE (deploy + ยืนยัน live ทั้ง 2 commit) |
| `0a8e550c` | `open-sse/utils/stream.js`, `open-sse/handlers/chatCore/streamingHandler.js` | LP-023: stream Claude→Claude (passthrough) ถอดชื่อ tool ที่ถูก cloak (`_ide`) กลับ | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `a5027546` | `open-sse/handlers/chatCore/nonStreamingHandler.js` | LP-024 (เดิม Bug D): non-stream ที่ target เป็น Gemini/Antigravity/Claude/Ollama แปลงต่อจาก chat.completion เป็นรูปแบบของ client (Claude message / Responses) | ACTIVE (deploy + ยืนยัน live แล้ว) |
| `35f6bbe9` | `open-sse/executors/codex.js` | LP-025: ส่ง `strict:false` ให้ function tool ของ Codex เมื่อ client ไม่ได้ระบุ (กัน codex ใส่ optional argument ครบทุกตัว) | ACTIVE (deploy + ยืนยัน live แล้ว) |

> ทั้ง 2 patch แรกแก้ **Bug B (autocompact thrash)** ร่วมกัน — Patch 1 แก้ caps ผิด, Patch 2 ทำให้ client ขอ 1M window ผ่าน combo ได้จริง

## ตรวจ Local Patches เมื่ออัปเดตเป็น v0.5.95 — 2026-10-02

Upstream: tag `v0.5.95`, commit `a99cf57239ff778b61e434c2786009d5ed1c412c` (41 commits, 137 files เทียบกับ `v0.5.91`)
Merge commit ของ fork: `c3deacad` (ทำบน branch `upgrade/v0.5.95` ใน worktree แยก แล้ว fast-forward `master`) — ใช้ merge ตามแบบรอบ v0.5.86/v0.5.91
เพราะประวัติ fork มี merge commit อยู่แล้ว การ rebase จะต้องเขียนประวัติที่ push ไปแล้วใหม่; ตรวจ implementation จริงของ upstream ทุกตัว ไม่ได้ตัดสินจาก changelog

### ไฟล์ที่ upstream แตะทับแพตช์

| ไฟล์ | upstream commit ใน v0.5.91..v0.5.95 | ผลต่อแพตช์ |
|---|---|---|
| `open-sse/providers/pricing.js` | `92c7bdd5` (GPT-6 Sol/Luna pricing), `dec820b9` (gpt-6.1-sol), Muse/Sonnet 5.5 rows | **conflict** — บล็อก gpt-5.6 / gpt-6 |
| `open-sse/providers/capabilities.js` | `89ffac5a` (GPT-6/5.4+ context windows, `refine()` catalog overlay ที่ step 2) | **conflict** — บรรทัด canonical lookup ของ Patch 1 |
| `open-sse/providers/registry/codex.js`, `tests/unit/codex-gpt6-lite.test.js` | `ca6e8407` (CLI identity 0.159.0), `dec820b9` | **conflict** — เหลือแค่ comment/รูปแบบเทส ค่าเท่ากัน |
| `open-sse/config/grokCli.js` (+7) | `6b9dc54d` | auto-merge — เนื้อหาเท่ากับ backport `c85dc41e` ทุกไฟล์ (`git diff v0.5.95 -- open-sse/config/grokCli.js` ว่าง) |
| `open-sse/executors/default.js`, `translator/formats/{claude,gemini}.js` | `5e9bd464`, `75834e96`, `ccd0677d`, `08b21fea`, `4f274c7f`, `aafe3002` | auto-merge คนละบล็อกกับ LP-003/LP-004/LP-006 |

### ผลประเมินรายแพตช์

| Patch | ผล | หลักฐานที่ตรวจจริงใน v0.5.95 |
|---|---|---|
| Patch 1 — GLM-5.2 suffix lookup | **MODIFIED** | upstream ยังไม่ strip suffix (`replace(/\(` ใน `capabilities.js` = 0 hit) แต่ step 2 เปลี่ยนเป็น `refine(caps, provider, model)` → resolve ให้ lookup ที่ strip แล้วผ่าน `refine()` ด้วย (ส่ง `lookupModel` ให้ catalog) runtime: ctx = 1000000 ทั้ง `glm-5.2` และ `glm-5.2(high)` |
| Patch 2 — Combo `[1m]` | REDUNDANT สำหรับ chat path (คงเดิม) | `stripModelContextMarker` ยังอยู่ `chat.js:55`; `tts.js:48` / `imageGeneration.js:50` ยังไม่ strip |
| LP-003 — native thinking | KEPT | upstream ยัง `isValidClaudeSignature(block.signature)` + `unshift(buildThinkingPlaceholder(...))` (`claude.js:285,300,619,640`) ส่วนแก้ prefill/Sonnet 5.x ของ upstream ไม่ได้แตะเรื่องนี้ |
| LP-004 — native client version | KEPT | v0.5.95 `default.js` ไม่อ่าน `rawHeaders["user-agent"]` เลย (0 hit) |
| LP-005 | UPSTREAM_FIXED (คงเดิม) | — |
| LP-006 — Gemini schema | KEPT | upstream `aafe3002` เพิ่ม `errorMessage` เข้า keyword list แต่ยังไม่มี `isPropertyMap` (0 hit) → property ชื่อ `errorMessage`/`title`/`format` ยังโดนลบถ้าไม่มีแพตช์ |
| LP-007 — gpt-6 rates | **UPSTREAM_FIXED** | `92c7bdd5`/`dec820b9`: astra 10/1/50, sol 2/0.20/10, 6.1-sol 2/0.10/10, luna 0.10/0.01/0.50 — ตรงหน้า pricing ทางการ (ตรวจ 2026-10-02) ใช้ฝั่ง upstream |
| LP-008 — effort suffix pricing | KEPT | upstream ยังไม่มี glob `gpt-6*` และไม่ strip suffix → `gpt-6-astra-high` = 10/1/50 เพราะแพตช์; tier `gpt-5.3-codex-high` ยังเท่าเดิม (8/4/32) |
| LP-009 — gpt-5.6 sol/terra/luna | **MODIFIED** | upstream ใส่ sol 5/0.50/30, terra 2.50/0.25/15, luna 1/0.10/6 ซึ่ง**ไม่ตรง**หน้าทางการ (sol 4/0.40/20, terra 2/0.20/12, luna 0.20/0.02/1.20) → เก็บเรตเรา แต่แก้ `cache_creation` ทั้ง MODEL_PRICING และ pattern `gpt-5.6-*-*` เป็นราคา cache write ทางการ (5.00 / 2.50 / 0.25 = 1.25x input) ตามแบบที่ upstream ใช้กับ gpt-6 |
| LP-010 / LP-011 / LP-012 | KEPT | upstream ไม่มี warn (`no pricing` 0 hit), `tests/vitest.config.js` ไม่มี `DATA_DIR` (`57c04f00` แค่ลบเทสที่เขียน DB จริงบางไฟล์ ไม่ได้กันทั้ง suite), ไม่มีสคริปต์ backfill |
| LP-013 — Muse Spark depth | KEPT + note | ยังใช้กับ opencode/opencode-go/opencode-zen ครบ; **ใหม่:** upstream เพิ่ม provider `muse` (Meta Model API ตรง, `28809807`) ซึ่ง**ไม่ผ่าน**ตัวจำกัดความลึกนี้ — ถ้าเริ่มใช้ provider นั้นและเจอ error ความลึก schema ให้ขยาย LP-013 |
| LP-014 — Codex identity + gpt-6.1-sol | **UPSTREAM_FIXED** | `ca6e8407` ตั้ง `CODEX_CLI_VERSION = "0.159.0"`, `dec820b9` เพิ่ม gpt-6.1-sol (model + pricing เท่ากับของเรา) → resolve ใช้ไฟล์ upstream; ไม่มีโค้ด LP-014 เหลือเป็น delta |
| LP-015 — Grok CLI 1.0.44 | **UPSTREAM_FIXED (ปิด)** | `6b9dc54d` อยู่ใน v0.5.95 แล้ว merge พามาเหมือนกันทุกไฟล์ ไม่มี delta เหลือ |
| LP-016 — Claude non-stream on forced-stream | KEPT | upstream `sseToJsonHandler.js` ไม่มีกิ่ง `FORMATS.CLAUDE` (0 hit); #3682/#3199/#3462 ยัง OPEN |
| Bug A — empty-schema `reason` | NEEDS_REVIEW (ไม่เปลี่ยน) | ยังคืน `properties.reason` + `required:["reason"]` |

### Validation (2026-10-02)

- **Full suite (เทียบราย assertion กับ master ก่อน merge):** master 103 failed, หลัง merge 106 failed จาก 3,208 tests
  **ไม่มี regression จากแพตช์หรือ merge** — 3 รายการที่เพิ่มแดงพิสูจน์ด้วย worktree ของ **tag `v0.5.95` เปล่า** ว่าแดงเหมือนกันเป๊ะ (3 failed / 32 passed):
  `cline-free-tier-models` (paid twin pricing), `codex-gpt6-lite` (gpt-6.1-sol capabilities), `codex-refresh-token` (`getRefreshLeadMs` 600000 vs 432000000)
- **Patch regression tests:** `claude-client-version`, `claude-forced-sse-nonstream`, `claude-native-thinking`, `muse-spark-tool-schema-depth`,
  `pricing-effort-suffix`, `capabilities` → **6 ไฟล์ 70 tests ผ่านทั้งหมด**
- **Baselines:** aliases (122 tokens) ✅, OAuth URLs ✅, providers ❌ `codex.headers` 0.155.0 → 0.159.0 (snapshot ค้างเดิม ไม่ใช่ regression)
- **ESLint:** `pricing.js`, `capabilities.js`, `handlers/chatCore/` ผ่าน
- **Versions:** root + CLI = **0.5.95** (merge พามา); CLI เพิ่ม dependency `confbox`
- **Install:** สำรอง global + SQLite ที่ `/tmp/9router-before-v0595-20261002/` (0700/0600) → `npm run cli:pack` → `npm install --global ./9router-0.5.95.tgz`
  → ปิดตัวเดิม → `launchctl kickstart`; รอบนี้รันจาก LaunchAgent (`cli.js --tray --skip-update`, listener PID 24644) `/api/health` = `{"ok":true}`
- **Live probe (`POST /v1/messages`, ทั้ง `stream:false` และ `true`):** `gcli/grok-4.7`, `cx/gpt-6.1-sol`, `cx/gpt-6-astra-low`, combo `9-deep-reasoner` (→ grok-4.7-xhigh)
  ได้ `"type":"message"` + SSE ครบ `message_start`→`message_stop`; `usageHistory` บันทึก cost > 0 ทุกแถว (LP-008 ทำงาน)
  combo `9-fast-worker` (→ antigravity) stream ปกติ แต่ non-stream ได้ chat.completion → ดู **Bug D**

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

> **v0.5.95 (2026-10-02):** LP-007 → UPSTREAM_FIXED (`92c7bdd5` เรต gpt-6 ตรงทางการแล้ว); LP-008 KEPT; LP-009 MODIFIED — upstream ใส่เรต gpt-5.6 sol/terra/luna ผิด จึงเก็บเรตเรา และแก้ `cache_creation` เป็นราคา cache write ทางการ (1.25x input: 5.00 / 2.50 / 0.25) ดูตารางรอบ v0.5.95 ด้านบน

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

**Install (2026-09-29):** `npm run cli:pack` → `npm install --global ./9router-0.5.91.tgz` (สำรองตัวเก่าที่ `/tmp/9router-global-backup-0.5.91-20260929-155525.tgz`) แล้วเปิดใหม่ผ่าน `launchctl kickstart gui/$(id -u)/com.9router.autostart` → `/api/health` = `{"ok":true}`; schema ดิบ 4 แบบข้างบนผ่าน gateway ได้ 200 ทั้งหมด และ sub-agent `fast-worker` กลับมารันได้ (ก่อนแก้ 400 ทันที)

**เช็คตอน upgrade:** ถ้า upstream เพิ่ม depth/schema sanitizer ของ Muse Spark เอง หรือ Muse ขยาย limit ให้ประเมินว่า patch นี้ยังจำเป็นไหม; ถ้า upstream แยก `normalizeResponsesTools` ออกเป็น helper ร่วม ต้องย้ายการเรียก `capToolSchemasDepth` ตามไปด้วย

---

## LP-014: Codex ปฏิเสธ gpt-6.1-sol เพราะ CLI identity เก่า

**Status:** UPSTREAM_FIXED (v0.5.95: `ca6e8407` identity 0.159.0, `dec820b9` gpt-6.1-sol — ตอน merge ใช้ไฟล์ upstream) · **Commits:** `7fd7ee12` (version bump), `d48c12c8` (model + pricing + test) · **Implemented:** 2026-09-30

**อาการ:** เพิ่ม custom model `gpt-6.1-sol` ในแดชบอร์ดแล้วกด Test ได้
`HTTP 400: {"detail":"The 'gpt-6.1-sol' model is not supported when using Codex with a ChatGPT account."}`
ทั้งที่บัญชีเดียวกันใช้โมเดลนี้ใน ChatGPT/Codex ได้ปกติ

**Root cause:** ข้อความนี้มาจาก backend ของ OpenAI **ไม่ใช่โค้ดเรา** (grep `not supported when using Codex` ในรีโป = 0 hit)
OpenAI gate สิทธิ์ใช้โมเดลด้วย **client identity ที่ 9Router ส่งเอง** — `version` และ `User-Agent: codex_cli_rs/<ver>`
จาก `CODEX_CLI_VERSION` ใน `open-sse/providers/registry/codex.js` ซึ่งยังเป็น `0.155.0`
`gpt-6.1-sol` (ออก 2026-09-29) ต้องการ **≥ 0.159.0** — 0.157.0/0.158.0 ก็ถูกปฏิเสธ

> ⚠️ **ไม่เกี่ยวกับ codex CLI ที่ติดตั้งในเครื่อง** 9Router ส่ง header พวกนี้เอง ไม่ได้เรียก binary ตัวนั้น
> (ตอนตรวจ เครื่องมี `codex-cli 0.156.1` อยู่ แต่ไม่มีผลต่อเส้นทางนี้) — comment เดิมในโค้ดที่เขียนว่า
> "Bump when the installed codex CLI is upgraded" ทำให้เข้าใจผิด จึงแก้ comment ไปด้วย

**Upstream:** [decolua/9router#4471](https://github.com/decolua/9router/issues/4471) — **OPEN** ยังไม่แก้
ตรวจ `upstream/master` แล้วยังเป็น `0.155.0` และไม่มี `gpt-6.1-sol` (tag ล่าสุดยังเป็น v0.5.91 = ที่เราอยู่) → CASE A

**Change:**
- `CODEX_CLI_VERSION`: `0.155.0` → `0.159.0` (single source ของทั้ง `version`, `User-Agent`, `cliVersion`)
- เพิ่ม `{ id: "gpt-6.1-sol", name: "GPT 6.1 Sol", responsesLite: true, thinkingLevels: GPT_6_LITE_THINKING_LEVELS }` ให้เป็น model ในตัว ไม่ต้องเพิ่มเป็น custom model
  (`responsesLite` ตามรุ่นก่อนหน้า `gpt-6-sol` — มีผลต่อ header `x-openai-internal-codex-responses-lite`, `instructions`, `reasoning.summary`/`context`)
- pricing `"gpt-6.1-sol"`: 2.00 / cached 0.10 / 10.00 ต่อ 1M (<https://developers.openai.com/api/docs/pricing>)
  ระดับ `-low/-medium/-high/-xhigh/-max` ไม่ต้องใส่แยก เพราะ LP-008 ตัด suffix ให้แล้ว
- caps + thinking levels ไม่ต้องแตะ: pattern `*gpt-6*` ใน `capabilities.js:297` และ `thinkingLevels.js:40` ครอบอยู่แล้ว (ตรวจ runtime: ctx 272000, reasoning true, levels low→max)

**Files:** `open-sse/providers/registry/codex.js`, `open-sse/providers/pricing.js`, `tests/unit/codex-gpt6-lite.test.js`

**เทส:** `unit/codex-gpt6-lite.test.js` เดิม pin literal `"0.155.0"` ไว้ → เปลี่ยนให้อ่านจาก registry
(ซึ่งเป็น single source ที่เทสนี้ควรตรวจจริงๆ) และเพิ่มเคสใหม่ยืนยันว่า version ที่ประกาศ **ห้ามต่ำกว่า 0.159.0**
กัน revert แล้ว gpt-6.1-sol พังเงียบๆ — 9/9 ผ่าน

**Validation (2026-09-30):** `unit/codex-gpt6-lite.test.js` 9/9 ผ่าน; runtime ตรวจ caps/levels ของ `gpt-6.1-sol` ตรงกับ `gpt-6-sol`

**Install (2026-09-30):** สำรอง global ที่ `~/.9router/db/backups/global-9router-pre-lp014-20260930-085646.tar.gz` →
`npm run cli:pack` → ตรวจ tarball ว่ามี `0.159.0` + `gpt-6.1-sol` และไม่เหลือ `0.155.0` → `npm install --global ./9router-0.5.91.tgz` →
เปิดใหม่ด้วย `launchctl kickstart -k gui/$(id -u)/com.9router.autostart` → `/api/health` = 200
**ยืนยันปลายทาง:** `POST /v1/chat/completions` ด้วย `cx/gpt-6.1-sol` ได้ **HTTP 200** (เดิม 400) และบันทึก
cost = `$0.00504200` (prompt 2496 × $2/1M + completion 5 × $10/1M) ตรงกับเรตทางการ

**⚠️ เช็คตอน upgrade รอบหน้า:**
- ถ้า upstream bump `CODEX_CLI_VERSION` เป็น ≥ 0.159.0 เอง → LP-014 ส่วน version = `UPSTREAM_FIXED`
  แต่ถ้า bump ไปค่าที่ **ต่ำกว่า** floor ของโมเดลที่ใช้อยู่ ต้องคง local patch ไว้ (เทส floor จะจับให้)
- ถ้า upstream เพิ่ม `gpt-6.1-sol` เอง ให้ลบ entry ซ้ำในของเรา แต่**ตรวจ `responsesLite` กับเรตราคาว่าตรงกัน**ก่อน
- โมเดลใหม่ของ Codex มักมี version floor ของตัวเอง — อาการเหมือนกันเป๊ะ (HTTP 400 `not supported ... ChatGPT account`)
  วิธีแก้คือ bump ค่าคงที่ตัวนี้ ไม่ใช่ไปอัปเดต codex CLI ในเครื่อง
- `tests/__baseline__/providers-baseline.json` pin `User-Agent` ไว้ที่ `0.154.0` ซึ่ง **stale มาตั้งแต่ก่อนแพตช์นี้**
  (upstream เองก็ 0.155.0 แล้ว) `verify-providers.mjs` จึงแดงอยู่ก่อนหน้าแล้ว ไม่ใช่ regression ของ LP-014
  ถ้าจะให้ gate นี้เขียว ต้อง re-snapshot ด้วย `tests/__baseline__/snapshot-providers.mjs` แยกต่างหาก

---

## LP-015: Grok CLI ผ่าน 9Router ได้ HTTP 426 เพราะ CLI identity เก่า (backport จาก upstream)

> **v0.5.95 (2026-10-02):** ปิดแล้ว — `6b9dc54d` มากับ merge `c3deacad` ไม่มี delta เหลือ

**Status:** UPSTREAM_FIXED (backport) · **Commit:** `c85dc41e` (cherry-pick `-x` ของ upstream `6b9dc54d`) · **Applied:** 2026-10-01

**อาการ:** เรียก `gcli/grok-4.7-xhigh` / `gcli/grok-4.7` (รวมถึงตัวแรกของ combo `9-deep-reasoner`) แล้ว fail ทุกครั้ง
`HTTP 426: Your Grok CLI version (0.2.99) is outdated. Please update to version 1.0.13 or later via 'grok update'`
ใน `usageHistory` ไม่มีแถว `grok-cli` เลยสักแถว เพราะไม่เคยมี request สำเร็จ; connection เองปกติ (token ยังไม่หมดอายุ, `lastError: null`)

**Root cause:** `cli-chat-proxy.grok.com` เริ่มปฏิเสธ client ที่ต่ำกว่า 1.0.13 แต่ 9Router ส่ง identity เองจาก
`GROK_CLI_VERSION = "0.2.99"` ใน `open-sse/config/grokCli.js` (ใช้ใน `x-grok-client-version` และ `User-Agent: grok-shell/<ver>`)
เหมือน LP-014 — **ไม่เกี่ยวกับ grok CLI ที่ติดตั้งในเครื่อง** และรีสตาร์ตเฉยๆ ไม่หาย เพราะเป็นค่าคงที่ที่ compile ไว้

**Upstream:** แก้แล้วใน `6b9dc54d` (2026-10-01) — `GROK_CLI_VERSION` → `1.0.44` → CASE B
แต่ fork ตามหลัง `upstream/master` อยู่ 41 commits จึงเลือก cherry-pick commit เดียวแทน full upgrade (ตามที่ผู้ใช้ตัดสินใจ)

**Files (จาก upstream ทั้งหมด ไม่มีโค้ดเขียนเอง):** `open-sse/config/grokCli.js`, `open-sse/providers/registry/grok-cli.js`,
`src/app/api/providers/[id]/test/testUtils.js`, `src/lib/oauth/providers/grok-cli.js`, `tests/__baseline__/providers-baseline.json`,
`tests/unit/grok-cli-{executor,models,usage}.test.js` — cherry-pick ไม่มี conflict

**Validation (2026-10-01):** `unit/grok-cli-{executor,models,usage}.test.js` 40/40 ผ่าน; `verify-providers.mjs` ส่วน grok-cli ตรงแล้ว
(ยังแดงที่ `codex.headers` ซึ่งเป็นของเดิมตามหมายเหตุใน LP-014 ไม่ใช่ regression)

**Install (2026-10-01):** สำรอง global + SQLite ที่ `/tmp/9router-before-grok426-20261001/` (mode 0700/0600) →
`npm run cli:pack` → ตรวจ tarball ว่ามี `1.0.44` → `npm install --global ./9router-0.5.91.tgz` → ปิดตัวเดิม (รันมือจาก ttys006) →
`launchctl kickstart` → `/api/health` = `{"ok":true}`
⚠️ รีสตาร์ตขณะมี traffic (12 connection) ตามที่ผู้ใช้สั่ง — request ค้างของ session อื่นถูกตัด; terminal ttys006 เปิดตัวเองซ้ำและกลายเป็นตัวที่รันอยู่ (listener PID 10202)
**ยืนยันปลายทาง:** `POST /v1/messages` ด้วย `gcli/grok-4.7-xhigh` และ `gcli/grok-4.7` ได้ **HTTP 200** (เดิม 426) ตอบ `"OK"`;
streaming ได้ Anthropic SSE ครบ (`message_start` → `message_stop`); `usageHistory` มีแถว `grok-cli | ok` แถวแรก

**⚠️ เช็คตอน upgrade รอบหน้า:**
- `6b9dc54d` อยู่ใน upstream แล้ว → ตอน rebase **ให้ drop `c85dc41e`** (git จะเห็นเป็น patch ซ้ำหรือว่าง) ไม่ต้อง re-apply
- ถ้าเจอ 426 อีก วิธีแก้คือ bump `GROK_CLI_VERSION` (ดูเวอร์ชันล่าสุดด้วย `npm view @xai-official/grok version`; ตอนตรวจ = 1.0.46) ไม่ใช่อัปเดต grok CLI ในเครื่อง

## LP-016: `/v1/messages` + `stream:false` บน provider ที่บังคับ stream คืน body รูปแบบ OpenAI (เดิม Bug C)

**Status:** ACTIVE · **Commit:** `8f7c6cde` · **Applied:** 2026-10-01 · **Upstream:** decolua/9router#3682, #3199, #3462 (ยัง OPEN ตอนตรวจ, ไม่มีโค้ดแก้ใน `upstream/master`) → CASE A

**อาการ:** client รูปแบบ Claude (`POST /v1/messages`, `stream:false`) ที่วิ่งไป provider ซึ่งบังคับ stream ฝั่ง upstream
(`grok-cli`, `codex` — executor ตั้ง `body.stream = true`) ได้ `{"object":"chat.completion","choices":[...]}` แทน `{"type":"message","content":[...]}`
→ Anthropic SDK / client non-stream parse ไม่ได้ (Claude Code ไม่โดนเพราะ stream เสมอ); provider ที่ไม่บังคับ stream (เช่น `cc/*`) ปกติ

**Root cause:** เส้น forced-stream ไม่ผ่าน `translateNonStreamingResponse` แต่ไปที่ `handleForcedSSEToJson` (`sseToJsonHandler.js`)
ซึ่งประกอบ SSE กลับเป็น chat.completion แล้วแปลงต่อเฉพาะกรณี `sourceFormat === OPENAI_RESPONSES` — ไม่มีกิ่งสำหรับ `FORMATS.CLAUDE`
จึงคืน chat.completion ดิบให้ client Claude ทั้งทาง Responses SSE (grok-cli/codex) และ chat SSE

**วิธีแก้:**
- ย้าย `openAICompletionToClaudeMessage` (+ `parseToolArguments`) จาก `nonStreamingHandler.js` ไปไฟล์ใหม่ `chatCore/claudeMessageBody.js`
  (แยกไฟล์เพราะ `nonStreamingHandler` import จาก `sseToJsonHandler` อยู่แล้ว — import กลับจะวน) พฤติกรรมเดิมไม่เปลี่ยน
- `sseToJsonHandler.js`: ทั้งกิ่ง Responses และกิ่ง chat SSE ถ้า `sourceFormat === FORMATS.CLAUDE` ให้แปลงด้วย `openAICompletionToClaudeMessage`
  (text / thinking / `tool_use`, `stop_reason` จาก `fromOpenAIFinish`, `usage.input_tokens/output_tokens`); client OpenAI/Responses ได้เหมือนเดิม

**Validation (2026-10-01):** เทสใหม่ `tests/unit/claude-forced-sse-nonstream.test.js` 4/4 (text, function_call→tool_use, OpenAI client ยังได้ chat.completion,
chat SSE tool call→tool_use); เทสที่เกี่ยวข้อง 52/52; full suite fail 97 เท่าเดิมก่อน/หลัง (ไม่มี regression ใหม่); eslint สะอาด

**Install (2026-10-01):** สำรอง global + SQLite ที่ `/tmp/9router-before-lp016-20261001/` (mode 0700/0600) → `npm run cli:pack` →
`npm install --global ./9router-0.5.91.tgz` → ปิดตัวเดิม → `launchctl kickstart`; terminal ttys006 เปิดตัวเองซ้ำอีกครั้ง (listener PID 59215 นิ่ง)
**ยืนยันปลายทาง:** `POST /v1/messages` `stream:false` — `gcli/grok-4.7` และ `cx/gpt-6-astra-low` ได้ `"type":"message"`, `content:[{type:"text",text:"OK"}]`,
`stop_reason:"end_turn"`, usage ครบ; streaming ทั้งสองตัวยังได้ Anthropic SSE ครบ (`message_start` → `message_stop`)

**⚠️ เช็คตอน upgrade รอบหน้า:**
- ดูว่า upstream ปิด #3682/#3199/#3462 หรือเพิ่มกิ่ง `FORMATS.CLAUDE` ใน `handleForcedSSEToJson` แล้วหรือยัง — ถ้าแก้ครบ → UPSTREAM_FIXED, drop `8f7c6cde`
- ถ้า upstream ย้าย/แก้ `openAICompletionToClaudeMessage` ใน `nonStreamingHandler.js` ให้ resolve โดยคง helper ไว้ที่เดียว (ไม่ duplicate)
- รัน `npx vitest run unit/claude-forced-sse-nonstream.test.js` ทุกครั้ง
- ยังไม่ได้แก้ (นอก scope): `antigravity` ตอบ SSE กลับมาแม้ client ส่ง `stream:false`

## LP-017 / LP-018 / LP-019 / LP-020: combo `9-fast-worker` ใช้ `muse/muse-spark-1.3-contributor(max)` แล้ว HTTP 400 (provider `muse` ตรงของ Meta)

**Status:** ACTIVE · **Commits:** `010d2460` (LP-017), `f2d5bba4` (LP-018), `d0da91c0` (LP-013 ขยาย), `db547565` (LP-019), `b528c903` (LP-020), test `dc84b0ab` · **Implemented:** 2026-10-02
**Upstream:** provider `muse` เพิ่งมาใน v0.5.95 (`28809807`); `upstream/master` = v0.5.95 ไม่มี commit แก้, ไม่มี issue ที่ตรง → CASE A

**อาการ:** ใส่ `muse/muse-spark-1.3-contributor(max)` เป็นตัวแรกของ `9-fast-worker` แล้วทุก request ได้
`[400] unknown parameter 'input'` แล้ว combo ตกไป `ag/gemini-3.8-flash-high` เงียบๆ (request ที่ fail ไม่ถูกบันทึกใน `usageHistory`)
เป็นทุก effort (none/low/high/xhigh/max) และทั้ง client แบบ Claude และ OpenAI — ใช้ได้เฉพาะ client แบบ Responses ที่ไม่ใส่ effort

**Root cause — 5 ชั้นซ้อนกัน (แยก commit ตามสาเหตุ):**
1. **LP-017 (URL ผิด):** model ของ muse ประกาศ `supportedFormats: ["openai-responses"]` client Claude/OpenAI จึงไม่ได้ใช้ transport ตาม sourceFormat
   (`useTransport = null`) `chatCore.js` แปลง body เป็น Responses ตาม `modelTargetFormat` แต่ไม่ได้เลือก transport ตาม format นั้น →
   executor ใช้ `baseUrl` default = `/v1/chat/completions` → body `input` ไปลงผิด endpoint
   **แก้:** ถ้า `targetFormat !== defaultFormat` ให้ใช้ `resolveTransport(provider, targetFormat)` กรณี format ตรงกับ default เดิม (ocg kimi/glm, MiniMax) ไม่เปลี่ยน
   — จงใจจำกัดแค่นี้เพราะ executor ใช้ `rt.headers` แทน `config.headers` เมื่อมี runtimeTransport
2. **LP-018 (ฟิลด์ effort ผิด):** pipeline ใส่ `reasoning_effort` top-level เสมอ (แม้ client ส่ง `reasoning.effort` มาถูก) แต่ Meta /v1/responses
   ตอบ `unknown parameter 'reasoning_effort'` — opencode-go/zen มี normalization นี้ให้ Muse อยู่แล้ว แต่ `muse` ใช้ DefaultExecutor
   **แก้:** `open-sse/executors/muse.js` (`MuseExecutor`) ย้ายเป็น `reasoning: { effort, summary: "auto" }` เฉพาะ body ที่มี `input` (Responses) ลงทะเบียนใน `executors/index.js`
   (`hasSpecializedExecutor` ไม่มี caller ใน repo — ไม่มีผลข้างเคียง)
3. **LP-013 ขยาย (schema ลึก):** หลังแก้ 1+2 ยิงตรง Meta ยังได้ `JSON schema exceeds the maximum nesting depth of 10 levels` เมื่อมี tool ซ้อนลึก
   เพราะ cap ของ LP-013 อยู่แค่ใน executor ของ opencode **แก้:** เรียก `capToolSchemasDepth` เดิมใน `MuseExecutor`
4. **LP-019 (max ถูกตัดเป็น xhigh):** muse-spark ไม่มี entry ใน `thinkingLevels.js` จึงได้ชุด openai (`none…xhigh`) → `(max)` ถูก clamp เป็น `xhigh`
   และอาจส่ง `none` ซึ่ง Meta ปฏิเสธ (`Supported values: [minimal, low, medium, high, xhigh, max]` — probe ตรง 2026-10-02)
   **แก้:** เพิ่ม `{ provider: "muse", pattern: "muse-spark*", levels: [minimal…max] }` จำกัดเฉพาะ `muse`
   ⚠️ **opencode-go ไม่ได้แก้:** `ocg/…(max)` ยังถูก clamp เป็น `xhigh` เหมือนเดิม (ยังไม่ได้ทดสอบว่า opencode ส่ง `max` ผ่านไปได้)
5. **LP-020 (non-stream ได้คำตอบว่าง):** พบหลัง deploy รอบแรกจาก request log — translator Responses ใส่ `stream: true` เสมอ
   (`openaiToOpenAIResponsesRequest`) Meta จึงตอบ SSE แม้ client ส่ง `stream:false`; muse ไม่ได้ประกาศ `forceStream` → `handleNonStreamingResponse`
   ส่ง SSE ให้ `parseSSEToOpenAIResponse` (parser ของ chat) ซึ่งไม่รู้จัก event ของ Responses → `chat.completion` ที่ `content: ""`
   และไม่แปลงเป็น Anthropic message ให้ client Claude **แก้:** `forceStream: true` ใน `transport` ของ muse เหมือน codex/grok-cli →
   ใช้ `handleForcedSSEToJson` (มี LP-016 แปลงเป็น `message` ให้ client Claude อยู่แล้ว)
   ⚠️ provider-level: ถ้ามี passthrough model ที่ไปทาง `/chat/completions` ก็จะถูก force stream ด้วย (handleForcedSSEToJson รองรับ chat SSE)

**Validation (2026-10-02):** `tests/unit/muse-direct-responses.test.js` 10/10 (รวม non-stream ของ LP-020; ตอนแรก 8/8) (URL ทั้ง client Claude/OpenAI, effort field, schema depth, levels + `(max)` → `max`,
opencode-go levels ไม่เปลี่ยน) — เทส URL แดงเมื่อไม่มี LP-017; เทส routing ที่เกี่ยวข้อง (minimax, opencode-go/zen, xiaomi-mimo) ผ่าน
(`force-stream-config` แดง 2 = ของเดิมตั้งแต่ v0.5.95); full suite 106 failed **เท่าเดิมทุก assertion** เทียบ merge v0.5.95; eslint ผ่าน
**หมายเหตุเทส:** fixture แบบ Claude ที่เป็น string content ก็เป็น OpenAI ที่ถูกต้องด้วย detectFormat จึงเดาเป็น openai — ต้องส่ง `sourceFormatOverride: "claude"`
แบบที่ route `/v1/messages` จริงทำ (`dc84b0ab`) มิฉะนั้นเทสจะผ่านโดยไม่ได้ทดสอบเส้น Claude จริง
**ยืนยันกับ Meta จริง (ก่อน deploy):** ให้โค้ดที่แก้สร้าง wire body จาก request แบบ Claude Code (`(max)`, stream, tool `Bash` + tool ซ้อน 13 ชั้น)
แล้วยิงตรง `https://api.meta.ai/v1/responses` ด้วย token ของ connection → **HTTP 200**, `effort: "max"`, เรียก tool `Bash`, จบ `response.completed`

**⚠️ เช็คตอน upgrade รอบหน้า:**
- ถ้า upstream แก้ `chatCore.js` ให้เลือก transport ตาม targetFormat เอง → LP-017 = UPSTREAM_FIXED (ดูเงื่อนไข headers ด้วย)
- ถ้า upstream เพิ่ม executor ของ `muse` เอง → รวม LP-018/LP-013 เข้ากับของ upstream ห้ามมี 2 ตัว
- ถ้า upstream เพิ่ม levels ของ muse-spark → LP-019 เทียบกับค่าที่ Meta รับจริงก่อนทิ้ง
- รัน `npx vitest run unit/muse-direct-responses.test.js` เป็น gate
- ถ้า upstream ประกาศ `forceStream` ให้ muse หรือทำให้ non-stream path อ่าน Responses SSE ได้ → LP-020 = UPSTREAM_FIXED

**Install (2026-10-02):** สำรอง global + SQLite ที่ `/tmp/9router-before-lp017-20261002/` (0700/0600) → `npm run cli:pack` → `npm install --global ./9router-0.5.95.tgz`
→ ปิด launcher ก่อนแล้วค่อยปิด server (รอบก่อนๆ ที่ "terminal เปิดซ้ำเอง" เกิดจากปิด server ลูกก่อน แล้ว `tryRestart` ของ launcher ปลุกตัวใหม่)
→ เปิดใหม่ตามที่ผู้ใช้สั่ง `ENABLE_REQUEST_LOGS=true 9router --tray --skip-update` (nohup, log ไป `/tmp/9router.log`) — deploy 2 รอบ
(รอบแรก LP-017..LP-019 เจอ LP-020 จาก request log, รอบสอง +LP-020) listener 54426 / launcher 54323 `/api/health` = `{"ok":true}`
⚠️ ตัวนี้**ไม่ได้**รันจาก LaunchAgent; request log อยู่ที่ `~/.local/lib/node_modules/9router/app/logs/` (หายเมื่อ reinstall) และ
`1_req_client.json` เก็บ header ของ client ทั้งหมดรวม `x-api-key` / `x-9r-peer-token` แบบ plaintext — ปิด `ENABLE_REQUEST_LOGS` เมื่อดีบักเสร็จ แล้วลบโฟลเดอร์ logs

**Live probe หลัง deploy (ผ่าน 9Router จริง):** `muse/muse-spark-1.3-contributor(max)` และ combo `9-fast-worker` (→ muse ตัวแรก) —
Claude non-stream ได้ `type:"message"` ทั้งข้อความ (`end_turn`) และ `tool_use:Bash`; OpenAI non-stream ได้ `chat.completion` มีข้อความ;
Claude stream + tool ได้ SSE ครบ `message_start`→`message_stop` พร้อม `tool_use` Bash; `usageHistory` บันทึก `muse … ok` cost > 0 ทุกแถว;
request log ยืนยัน wire = `https://api.meta.ai/v1/responses`, `reasoning: {effort: "max", summary: "auto"}`, ไม่มี `reasoning_effort`

**Push (2026-10-02):** `origin/master` (`gftdon/9router`) `d3053f85..2b5bcbac` — 8 commits (LP-017..LP-020 + test `dc84b0ab` + docs) push ปกติ ไม่ force

## LP-021: Claude 400 `Invalid signature in thinking block` ใน session ของ combo ที่เคยตกไปโมเดลอื่น

**Status:** ACTIVE (deploy + ยืนยัน live 2026-10-03) · **Commit:** `2735ef3a` · **Implemented:** 2026-10-02 · **ต่อยอดจาก:** LP-003 (`b35cdcac`)

**พบจาก:** ตรวจ request log หลังเปิด `ENABLE_REQUEST_LOGS` (20:50–21:40, 116 request) — error จริงครั้งเดียว 21:03:41
combo `9-orchestrator` → `cc/claude-opus-5-5(medium)` ได้ `400 invalid_request_error: messages.3.content.0: Invalid \`signature\` in \`thinking\` block`
(session 185 messages; Claude Code ส่งซ้ำ 1 วินาทีต่อมาแล้วผ่าน → เสีย 1 รอบ แต่เกิดซ้ำได้ทุก session แบบเดียวกัน)

**Root cause:** `9-orchestrator` = claude → kimi → gpt-6-astra; เทิร์นที่ kimi/gpt ตอบถูก Claude Code เก็บเป็น thinking block ที่ `signature: ""`
(ใน session นั้นมี 13 block ทั้งหมดเป็น signature ว่าง ที่ messages 3…169) LP-003 เลิกทิ้ง thinking block ทั้งหมดและ "ปล่อยให้ Anthropic ตรวจเอง"
เพื่อไม่ให้ prefix heuristic ทิ้ง signature แบบใหม่ (`CAIS…`) → block ที่ signature ว่างจึงหลุดไป Anthropic ด้วย

**วิธีแก้:** `normalizeClaudePassthrough` step 5 ทิ้งเพิ่มเฉพาะ `thinking` ที่ไม่มี `signature` หรือเป็น `""` และ `redacted_thinking` ที่ไม่มี `data`
(`isUnsignedThinking`) — signature ที่มีค่าใดๆ ยังส่งต่อแบบ opaque ตาม LP-003 ไม่ใช้ prefix heuristic
turn ที่ว่างหลังทิ้งจะถูกขั้นถัดไปของ upstream ลบทั้ง message เหมือนกรณี foreign `server_tool_use`
(ลองใส่ guard "ไม่ให้ turn ว่าง" ในรอบแรกแล้วชน `claude-foreign-server-tool-use` test ของ upstream จึงเอาออก)

**Validation (2026-10-02):** `claude-native-thinking` 12/12 (เพิ่ม 2: ทิ้ง unsigned/คง opaque ตามลำดับ, turn ว่างถูกลบ) — เทสใหม่แดงเมื่อไม่มี fix;
`claude-foreign-server-tool-use` ผ่าน; full suite 106 failed เท่าเดิมทุก assertion; eslint ผ่าน
**Replay request จริง (21:03:41) ผ่านโค้ดใหม่:** thinking block 13 → 0, ไม่มี assistant turn ว่าง, ไม่มี block ไหนอยู่ใน assistant turn ล่าสุด (index 183)

**Install (2026-10-02 23:5x):** สำรอง global (ไม่รวม `app/logs`) + SQLite ที่ `/tmp/9router-before-lp021-20261002/` → `npm install --global ./9router-0.5.95.tgz`
→ ปิด launcher แล้ว server (ตัด 6 connection) → ลบ request log เก่า 820 MB / 459 โฟลเดอร์ (npm install แทนที่โฟลเดอร์ package จึงหายไปด้วย; สำรองใน `/tmp` ไม่มีสำเนา log)
→ ผู้ใช้เปิดใหม่เองที่ ttys006 ด้วย `ENABLE_REQUEST_LOGS=true 9router` (00:00 2026-10-03)

**Live test (2026-10-03):** ขอ thinking จริงจาก `cc/claude-opus-5-5` (ได้ signature 816 ตัวอักษร) แล้วส่งประวัติผสม: thinking `signature:""` (จำลองเทิร์น kimi) + thinking ที่ signed จริง
- **ด้วย UA ของ Claude Code** (`claude-cli/2.1.287`, เส้น passthrough ของ LP-003): request log `4_req_target.json` ยืนยัน wire = `str | text | str | thinking+text | str`
  → block ที่ signature ว่างถูกทิ้ง, signature จริงถูกส่งต่อ **byte-for-byte** — แต่ Anthropic ตอบ **429 `rate_limit_error` ("Error")** ทุกครั้ง (00:02–00:07)
  **สาเหตุของ 429 (แก้ข้อสรุปเดิมที่ว่าเป็น rate limit ของบัญชี — ผิด):** เป็นวิธีทดสอบ ไม่ใช่ LP-021 และไม่ใช่โควตา —
  curl ปลอม UA `claude-cli/…` ทำให้ 9Router มองเป็น Claude Code native passthrough (`isNativePassthrough` ดูแค่ client tool จาก UA) จึง**ไม่ cloak**
  แต่ body ของ curl ไม่มีสิ่งที่ Claude Code จริงส่ง: `system` ที่มี `x-anthropic-billing-header`, `metadata.user_id`, header `x-claude-code-session-id`
  → Anthropic ปฏิเสธ OAuth request ที่ไม่ระบุตัวเป็น Claude Code ด้วย 429 "Error" ทุกขนาด (แม้ `max_tokens: 50` ไม่มี thinking)
  ส่วน request UA curl ที่ผ่าน 200 ถูก cloak ครบ (billing header + metadata + session id) ใน `4_req_target.json`
  ทดสอบ "curl ก็ 429" ช่วง 00:03 ไม่มี log เพราะถูก `modelLock` ของ 9Router ตีกลับก่อนถึง Anthropic
  ผลกระทบต่อ Claude Code จริง: ไม่มี (ส่ง billing header/metadata เอง; claude ผ่าน `9-orchestrator` 37 request ok ในช่วง log 20:50–21:40)
- **ยืนยันด้วย Claude Code จริง (2.1.287, 00:14):** session ใน `/tmp/lp021-cc` เทิร์น 1 `kimi/kimi-k3(max)` → resume เทิร์น 2 `cc/claude-opus-5-5` = 200 ("400")
  แต่ Claude Code **ตัด thinking ของโมเดลอื่นทิ้งเองเมื่อเปลี่ยนชื่อ model** (client body เทิร์น 2 ไม่มี thinking) จึงยังไม่โดน LP-021 —
  bug จริงเกิดเฉพาะเมื่อชื่อ model คงเดิม (combo `9-orchestrator`) แต่ fallback ไปตอบด้วยโมเดลอื่น
  จึง replay request จริงของเทิร์น 2 (header + billing header + metadata ของ Claude Code ครบ) ผ่าน 9Router โดยใส่ thinking ใน assistant turn:
  | variant | ผล |
  |---|---|
  | A: ไม่แก้ (control) | 200, ตอบ "400", `message_stop` |
  | B: thinking `signature: ""` (กรณี 21:03) | **200** — LP-021 ทิ้ง block แล้ว Anthropic รับ ✅ |
  | C: thinking ที่มี signature จริงของ kimi (4,340 ตัวอักษร, ไม่ว่าง) | **400 `Invalid signature in thinking block`** ❌ → LP-022 |

- **ด้วย UA อื่น (curl):** HTTP 200 ตอบถูก ("400") แต่เส้นนี้ 9Router ตัด thinking ของเทิร์นก่อนทิ้งทั้งหมดอยู่แล้ว (พฤติกรรม upstream สำหรับ client ที่ไม่ใช่ Claude Code) จึงไม่ได้ทดสอบ LP-021 จริง
- ⚠️ ทุกครั้งที่ 429, 9Router ตั้ง `modelLock_claude-opus-5-5` ใหม่ (~2 วินาทีถึงนาที) → หยุดยิงทดสอบซ้ำเพื่อไม่ให้ session อื่นโดน lock ต่อ
- **ค้าง:** ยิง request แบบ Claude Code ซ้ำเมื่อ rate limit หาย แล้วต้องได้ 200; หรือดูจาก log ว่า session ยาวของ `9-orchestrator` ไม่เจอ 400 `Invalid signature` อีก

**⚠️ เช็คตอน upgrade รอบหน้า:**
- ถ้า upstream แก้ step 5 ของ `normalizeClaudePassthrough` (กลับไปใช้ `isValidClaudeSignature` หรือ placeholder) ให้ทบทวน LP-003 + LP-021 พร้อมกัน
- ข้อจำกัด: ถ้า assistant turn **ล่าสุด** ของ tool loop มีแต่ thinking ที่ signature ว่าง แล้วเปิด thinking อยู่ Anthropic อาจตอบว่าต้องมี thinking block แทน — ยังไม่เจอใน log

## LP-022: thinking ที่มี signature ของโมเดลอื่น (ไม่ว่าง) ทำให้ Claude 400 — retry โดยตัด thinking

**Status:** ACTIVE · **Commits:** `5c96c99e` (deploy + ยืนยัน live 2026-10-03), `4e8d2f28` (ปรับเงื่อนไขปิด thinking — deploy + ยืนยัน live 2026-10-03) · **Implemented:** 2026-10-03 · **เดิม:** Bug E · **ต่อยอด:** LP-003, LP-021

**อาการ:** combo ชื่อเดิม (เช่น `9-orchestrator` = claude → kimi → …) fallback ไป kimi; kimi ส่ง thinking พร้อม signature ของตัวเอง (ไม่ว่าง) Claude Code เก็บไว้
→ เทิร์นต่อมากลับไป Claude → 400 `Invalid \`signature\` in \`thinking\` block` (replay variant C ใน LP-021) LP-021 ทิ้งได้แค่ signature ว่าง
และ LP-003 ห้ามเดารูปแบบ signature (เคยทิ้ง signature แบบใหม่ของ Claude ผิด)

**วิธีแก้ (ทางเลือก 1 ที่ผู้ใช้เลือก):** ใน `chatCore.js` ถ้า target เป็น Claude และได้ 400 ที่ข้อความตรง `Invalid \`signature\` in \`thinking\` block` เท่านั้น
→ `stripThinkingForSignatureRetry` (`claude.js`) ตัด thinking/redacted_thinking ทุกอันออกจาก assistant turn แล้ว `executor.execute` ซ้ำ **1 ครั้ง**
- ถ้า assistant turn **ล่าสุด** เสีย thinking ไป **และจบด้วย `tool_use` (tool loop ที่ยังเปิดอยู่)** → ปิด `thinking` สำหรับ retry นั้น
  (`4e8d2f28`: เดิม `5c96c99e` ปิดทุกครั้งที่ turn ล่าสุดเสีย thinking แม้จบด้วยข้อความ — เห็นจาก request log ตอนยืนยัน live ว่าปิดโดยไม่จำเป็น) และเอา `context_management.edits` ชนิด `clear_thinking*` ออกด้วย
  (API บังคับให้ turn นั้นขึ้นต้นด้วย thinking ถ้าเปิด thinking; clear_thinking ใช้ไม่ได้ถ้าปิด thinking) — ราคาที่จ่าย: เทิร์นนั้นตอบโดยไม่มี extended thinking
- 400 อื่นไม่ retry; retry ล้มก็คืน error เดิมตามปกติ
- เทส source-scan ของ upstream `opencode-go-session` (`executor.execute({...})` ต้องมี 2 จุด) ปรับเป็น 3 — เจตนาเดิมคือทุก call ต้องส่ง `providerSessionId: sessionSeed` + `clientTool` ซึ่ง call ใหม่ส่งครบ

**Validation (2026-10-03):** `claude-native-thinking` 15/15 (+3: retry ตัด thinking, tool loop ปิด thinking + ตัด clear_thinking, 400 อื่นไม่ retry) — 2 เทส retry แดงเมื่อไม่มี fix;
`opencode-go-session`, `claude-foreign-server-tool-use` ผ่าน; full suite 106 failed เท่าก่อนแก้ทุก assertion (หลังปรับเทส source-scan); eslint ผ่าน
**Install + live (2026-10-03 00:2x):** สำรองที่ `/tmp/9router-before-lp022-20261003/` (ไม่รวม logs) → ติดตั้ง build `5c96c99e` → ปิด launcher/server → ลบ request logs
→ ผู้ใช้เปิดใหม่ที่ ttys006 (`ENABLE_REQUEST_LOGS=true`) → replay request จริงของ Claude Code (`/tmp/lp021-cc`): **A 200, B 200, C 200** (ตอบ "400", `message_stop`)
C: request log `4_req_target.json` = assistant `text` ไม่มี thinking (retry ทำงาน) แต่ `thinking` ถูกปิดทั้งที่ turn ล่าสุดจบด้วยข้อความ → แก้ใน `4e8d2f28`
(full suite 106 เท่าเดิม; เทสเพิ่ม assertion ว่า turn ข้อความยังเปิด thinking + คง `clear_thinking`)
**Deploy `4e8d2f28` (2026-10-03 00:3x):** สำรองที่ `/tmp/9router-before-lp022b-20261003/` (ไม่รวม logs) → ปิด launcher/server ที่ ttys006 (ไม่มี connection ค้าง)
→ ติดตั้ง (request logs เดิมหายไปกับการแทนที่โฟลเดอร์ package) → เปิดใหม่ `ENABLE_REQUEST_LOGS=true 9router --tray --skip-update` แบบ nohup (log `/tmp/9router.log`, **ไม่ได้**รันใน ttys006)
→ replay **A 200, B 200, C 200**; request log ของ C: assistant `text` ไม่มี thinking block และ `thinking: {type: "adaptive"}` **ยังเปิดอยู่** ✅

**⚠️ เช็คตอน upgrade รอบหน้า:** เทียบกับวิธีที่ upstream จัดการ signature ต่างโมเดล; ถ้า upstream เพิ่ม `executor.execute` จุดใหม่ เทส source-scan จะต้องนับใหม่

---

## LP-023: stream Claude→Claude ส่งชื่อ tool ที่ถูก cloak (`calc_ide`) กลับไปให้ client

**Status:** ACTIVE · **Commit:** `0a8e550c` · **Implemented:** 2026-10-03 · **Upstream:** ยังไม่แก้ (`upstream/master` = v0.5.95 ตอนตรวจ)

**อาการ (เจอจากทดสอบสลับโมเดลทุกตัวใน combo 2026-10-03):** client รูปแบบ Claude ที่**ไม่ใช่** Claude Code ตัวจริง (curl, tool อื่น) เรียก `cc/...` ด้วย OAuth token แบบ `stream:true` พร้อม tools
→ ได้ `tool_use.name = "calc_ide"` แทน `"calc"`; ส่ง history กลับไปก็ถูก cloak ซ้ำเป็น `calc_ide_ide` (โมเดลบอกเองว่า "เรียกผิดชื่อเป็น calc_ide_ide") — `stream:false` ปกติ
Claude Code ตัวจริง**ไม่โดน** เพราะเข้า native passthrough ที่ไม่ cloak tool

**Root cause:** `translateRequest` cloak ชื่อ tool (`cloakToolsOnOAuth` + `sk-ant-oat`) แม้ source = target = claude
แต่ `buildTransformStream` (`streamingHandler.js`) เลือก `createPassthroughStreamWithLogger` เมื่อไม่ต้อง translate ซึ่ง**ไม่ได้รับ `toolNameMap` และไม่เรียก `translateResponse()`**
→ ทางถอดชื่อที่ upstream ใส่ไว้ใน same-format branch ของ `translateResponse` (`decloakStreamChunk`, #4342) ไม่เคยทำงานบน stream จริง
(เทส upstream `claude-claude-stream-decloak` เรียก `translateResponse` ตรงๆ จึงไม่จับ)

**วิธีแก้:** ส่ง `toolNameMap` เข้า passthrough stream (พารามิเตอร์ท้ายของ `createPassthroughStreamWithLogger`) และเมื่อ map ไม่ว่าง
ใช้ `restoreToolNames(decloakStreamChunk(...))` กับแต่ละ SSE event ตัวเดียวกับ same-format branch — ไม่มี map (native passthrough) = ไม่แตะ จึงไม่ตัด `_ide` ของ tool จริงของผู้ใช้

**Validation (2026-10-03):** เทสใหม่ `tests/unit/claude-passthrough-stream-decloak.test.js` 3 ข้อ (ส่ง SSE ผ่าน stream จริง) — 2 ข้อแดงเมื่อไม่มี fix;
full suite เทียบรายข้อกับก่อนแก้: ไม่มี fail ใหม่ (102 → 100 = 2 ข้อของ LP-023)
**Deploy + live (2026-10-03 00:5x):** สำรองที่ `/tmp/9router-before-lp023-20261003/` (ไม่รวม logs) → ลบ request logs เก่า → ปิด launcher/server (เดิมรันที่ ttys006)
→ ติดตั้ง → เปิด `ENABLE_REQUEST_LOGS=true 9router --tray --skip-update` แบบ nohup (`/tmp/9router.log`)
→ chain สลับทุกโมเดล 10 เทิร์น + chain combo 7 เทิร์น (stream, tool + thinking): ทุกเทิร์น 200, `cc/` คืน `calc` ✅;
request log: `4_req_target` ยังเป็น `calc_ide` (cloak ทำงานตามเดิม) แต่ `7_res_client` ไม่มี `calc_ide` เลย; Claude Code จริง (`9-orchestrator` + Read) ปกติ

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream ส่ง `toolNameMap` เข้า passthrough stream หรือเปลี่ยนให้ same-format ไปทาง translate stream → ประเมินเป็น UPSTREAM_FIXED

---

## LP-024: non-stream คืน chat.completion ให้ client Claude/Responses เมื่อ target เป็น Gemini/Antigravity/Claude/Ollama (เดิม Bug D)

**Status:** ACTIVE · **Commit:** `a5027546` · **Implemented:** 2026-10-03 · **Upstream:** ยังไม่แก้ (v0.5.95) — CASE A · **ต่อยอด:** LP-016 (คนละเส้นทาง)

**อาการ:** `POST /v1/messages` + `stream:false` (หรือ SDK ที่ส่ง `Accept: application/json`) ไป `ag/…` หรือ combo ที่ตกไป ag (`9-haiku-level`, `9-browser-task`, `9-content-scoring`, `9-fast-worker`)
→ ได้ `{"object":"chat.completion","choices":[…],"usage":{}}` — ไม่มี `content`/`stop_reason`, tool call อยู่ใน `choices[].message.tool_calls`, `usage` ถูก `filterUsageForFormat(…, claude)` กรองจนว่าง
ไม่กระทบ Claude Code (ใช้ stream) และไม่กระทบสถิติ dashboard (`extractUsageFromResponse` อ่าน body ดิบ)

**Root cause:** `translateNonStreamingResponse` (`nonStreamingHandler.js`) แปลง target → OpenAI แล้ว `return` ทันทีในทุก branch ของ Gemini/Antigravity/Vertex, Claude และ Ollama
ขา OpenAI → client มีแค่กรณี target = OpenAI (Responses / Claude) — request log: `5_res_provider` = Gemini JSON, `7_res_client` = chat.completion

**วิธีแก้:** ย้ายตัวแปลงเดิมเป็น `translateProviderBodyToOpenAI` แล้ว `translateNonStreamingResponse` แปลงต่อเมื่อ target ≠ OpenAI, target ≠ source และผลมี `choices`:
client Claude → `openAICompletionToClaudeMessage` (ตัวเดียวกับ LP-016), client Responses → `openAICompletionToResponses` — client OpenAI เหมือนเดิม
(thinking ของ Gemini กลายเป็น thinking block ไม่มี signature → ถ้าส่งกลับไป Claude ภายหลัง LP-021 ทิ้งให้)

**Validation (2026-10-03):** เทสใหม่ `tests/unit/nonstream-client-format.test.js` 6 ข้อ (ag ข้อความ, ag functionCall + thought, gemini → Responses, ollama → Claude, client OpenAI ไม่เปลี่ยน, ผ่าน `handleNonStreamingResponse` ได้ usage ไม่ว่าง) — 5 ข้อแดงเมื่อไม่มี fix;
full suite เทียบรายข้อ: ไม่มี fail ใหม่
**Deploy + live (2026-10-03 01:2x):** สำรองที่ `/tmp/9router-before-lp024-025-20261003/` (ไม่รวม logs) → ปิด launcher/server (nohup) → ติดตั้ง build `a5027546` (logs เดิมหายไปกับการแทนที่โฟลเดอร์)
→ เปิด `ENABLE_REQUEST_LOGS=true 9router --tray --skip-update` แบบ nohup → `ag/gemini-3.8-flash-high`, `9-haiku-level`, `9-browser-task` non-stream ได้ `type:"message"` + `stop_reason`;
ag + tool ได้ `tool_use` + `stop_reason:"tool_use"`; client `/v1/responses` non-stream ได้ `object:"response"` + `usage`; matrix ทุกโมเดล stream/non-stream 200
(หมายเหตุ: ไม่ใส่ `stream` และไม่ส่ง `Accept: application/json` → upstream ถือเป็น stream (`body.stream !== false`) — SDK จริงส่ง Accept จึงได้ JSON; ไม่ใช่บั๊ก)

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream เพิ่มขา OpenAI → client ใน `translateNonStreamingResponse` เอง → UPSTREAM_FIXED

---

## LP-025: Codex ใส่ optional argument ของ tool ครบทุกตัว (Agent `model`/`isolation:"worktree"`, Read `offset/limit` …)

**Status:** ACTIVE · **Commit:** `35f6bbe9` (deploy พร้อม LP-024 ใน build `a5027546`) · **Implemented:** 2026-10-03 · **Upstream:** ยังไม่แก้ (v0.5.95)
(LP-024 จองไว้ให้ Bug D)

**อาการ (ทดสอบ `9-orchestrator` ที่ย้าย `cx/gpt-6.1-sol-high` ขึ้นเป็นตัวแรก 2026-10-03):** ทุก tool call ของ codex ใส่ optional ครบ
- Agent: `model:"sonnet"/"opus"/"haiku"`, `isolation:"worktree"`, `mode:"default"`, `team_name:""` — `model` ทับ model ที่ agent definition พินไว้ (เทสหนึ่งส่ง `haiku` ให้ fast-worker) และขัด CLAUDE.md; `worktree` ทำให้งานที่แก้ไฟล์ไปอยู่ใน worktree แยก
- Read `offset:0, limit:2000`; Grep `glob:""`, `-B:0`, `-A:0`; playwright `regex:""` — Claude ในเทิร์นเดียวกันส่งแค่ field ที่จำเป็น

**Root cause:** `normalizeCodexTools` (`open-sse/executors/codex.js`) ประกอบ function tool ใหม่โดยไม่มี `strict` (และ request ที่มาจาก Claude ก็ไม่มี `strict` อยู่แล้ว)
→ Codex backend ทำ constrained decoding แบบ strict เมื่อไม่ระบุ → โมเดลต้องเติมทุก key
**ยืนยันด้วยการยิง request ที่ log ไว้ตรงไป `chatgpt.com/backend-api/codex/responses` (tool Agent ของ Claude Code, 3 ครั้งต่อแบบ):**
ไม่มี `strict` → optional 7/7 ทุกครั้ง · `strict:false` → มีแค่ `subagent_type` ทุกครั้ง · `strict:true` → 400 `'required' … including every key in properties`
(ยิงผ่าน `/v1/responses` พร้อม `strict:false` ก็ไม่ช่วย เพราะ executor ตัดทิ้ง)

**วิธีแก้:** ใน `normalizeCodexTools` เก็บค่า `strict` ที่ client ส่งมา (ทั้ง flat และ `function.strict`) ถ้าไม่มีให้ใส่ `strict:false` แบบเดียวกับที่ Codex CLI ส่ง
— namespace/custom/hosted tool ไม่แตะ

**Validation (2026-10-03):** `codex-tool-normalization` +2 เทส (default false, คงค่าที่ client ระบุ) — แดงเมื่อไม่มี fix;
`codex-gpt6-lite` เทส web_search เทียบ shape tool แบบตรงตัว → เพิ่ม `strict:false` ในค่าที่คาด (เจตนาเดิมคือ web_search ยังอยู่);
full suite เทียบรายข้อ: ไม่มี fail ใหม่ (`lists gpt-6.1-sol with Codex capabilities` แดงอยู่ก่อนแล้ว — contextWindow 1,050,000 vs 272,000)

**Live (2026-10-03 01:2x, build `a5027546`):** Claude Code จริง `9-orchestrator` (cx-sol นำ) สั่ง fast-worker + deep-reasoner:
Agent ส่งแค่ `description`, `subagent_type`, `name` (ไม่มี `model`/`isolation`/`mode`/`team_name`), Read ส่งแค่ `file_path` (ใส่ `offset/limit` เฉพาะตอนต้องการจริง),
`4_req_target` ทุก request มี `strict:false`; คำตอบ subagent ถูก (chatCore มี `.js` 5 ไฟล์); ไม่มี worktree ค้าง

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream เริ่มส่ง `strict` เองใน codex executor หรือ translator → เทียบแล้วประเมิน UPSTREAM_FIXED

---

## LP-026: Gemini/Antigravity ส่ง `reason` ให้ tool ที่ไม่มี parameter → Claude Code `InputValidationError` (เดิม Bug A)

**Status:** ACTIVE · **Commit:** `09c1e5a9` · **Implemented:** 2026-10-03 · **Upstream:** ยังไม่แก้ (v0.5.95; placeholder มาจาก `e3e3e235` "fill empty tool schemas after $ref strip") — CASE A

**อาการ (ยืนยันก่อนแก้ 2026-10-03):** Claude Code จริง `--model 9-haiku-level` (ตอบโดย `gemini-3.8-flash`) สั่งเรียก `TaskList` →
6/7 ครั้งได้ `TaskList {"reason": "ตรวจสอบรายการงาน…"}` → `InputValidationError: TaskList failed … An unexpected parameter \`reason\` was provided`;
ยิง API ตรงด้วย tool schema ว่าง (`TaskList`, `Ping`): ag/`9-haiku-level` ใส่ `reason` ทั้ง stream/non-stream; grok/codex ส่ง `{}` ปกติ
กระทบ tool ไม่มี parameter (`TaskList`, `EnterPlanMode`, `CronList` …) เฉพาะเส้นทาง Gemini/Antigravity/Vertex — combo `9-haiku-level`, `9-browser-task`, ตอน `9-fast-worker`/`9-content-scoring` ตกไป ag

**Root cause:** `cleanJSONSchemaForAntigravity` → `addPlaceholders` เติม `properties.reason` + `required:["reason"]` ให้ object schema ที่ว่าง (Vertex/Antigravity ไม่รับ properties ว่าง)
→ โมเดลเห็นว่า required จึงส่งมาแทบทุกครั้ง และฝั่ง response ไม่มีใครตัดออก

**วิธีแก้:**
- placeholder ย้ายไป `translator/concerns/schemaPlaceholder.js` และ**ไม่ใส่ `required`** (ยังคง property ไว้ให้ Gemini รับ schema) — ทั้งใน cleaner และ fallback ของ `AntigravityExecutor`
- ตัด `reason` ออกจาก argument ของ functionCall ที่แปลงกลับ **เฉพาะตำแหน่งที่ schema เดิมของ client ไม่มี properties** (จุดเดียวกับที่ cleaner เติม; รองรับ object ซ้อน/`items`)
  — stream: `gemini-to-openai.js` อ่าน `state.clientToolSchemas` (สร้างจาก `body.tools` ใน `createSSEStream`); non-stream: `translateNonStreamingResponse(…, clientToolSchemas)`
- tool ที่มี `reason` เป็น parameter จริง หรือ tool ที่ไม่รู้จัก → ไม่แตะ

**Validation (2026-10-03):** `tests/unit/gemini-schema-placeholder-strip.test.js` 5 ข้อ (cleaner ไม่ required, strip เฉพาะ schema ว่าง/ซ้อน, non-stream, stream, tool ไม่รู้จัก) — 3 ข้อที่แตะ wiring แดงเมื่อไม่มี fix;
full suite เทียบรายข้อ: ไม่มี fail ใหม่ (pass +5); eslint ผ่าน
**Deploy + live (2026-10-03 01:5x):** สำรองที่ `/tmp/9router-before-lp026-20261003/` → ปิด server ที่ผู้ใช้เปิดใน ttys006 (ไม่มี request logs) → ติดตั้ง build `09c1e5a9`
→ เปิด `9router --tray --skip-update` แบบ nohup (logs ปิด) → API: ag/`9-haiku-level` stream+non-stream ได้ `TaskList {}`, `Ping {}`, `Note {"reason":"test"}` (reason จริงยังอยู่);
Claude Code จริง `9-haiku-level` เรียก `TaskList` 3/3 ได้ `{}` → `No tasks found` ไม่มี error

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream เปลี่ยน placeholder (ชื่อ/required) หรือเพิ่มการ strip เอง → เทียบ `addPlaceholders` แล้วประเมิน UPSTREAM_FIXED

---

## LP-027: `ocg/muse-spark…(max)` ถูกตัดเหลือ xhigh

**Status:** ACTIVE · **Commit:** `d58788ff` · **Implemented:** 2026-10-03 · **ต่อยอด:** LP-019 (ตัวเดียวกันบน provider `muse` ตรง)

**Root cause:** `getThinkingLevels("opencode-go", "muse-spark-…")` ไม่ตรงกฎ `{ provider: "muse", pattern: "muse-spark*" }` ของ LP-019 จึงตกไปใช้ค่ากลาง `openai`
(`none…xhigh` ไม่มี `max`) → `thinkingUnified.js` clamp `(max)` เป็น `xhigh` ก่อนส่งออก

**Probe ตรง `https://opencode.ai/zen/go/v1/responses` (2026-10-03, header `x-opencode-session` + UA `opencode/1.18.31` แบบ executor):**
`xhigh` 2/2 completed · `max` 3/5 completed (echo `"effort":"max"`, ตอบถูก, 3–41 s), 2/5 = 503 `service_overloaded` (ชั่วคราว; request ที่ไม่ใส่ effort ก็เคยได้ 504)
· `bogus` → 400 `expected one of none, minimal, low, medium, high, xhigh, max` · `none` → 400 `'none' is not supported for model 'muse-spark-1.3-contributor'`

**วิธีแก้:** เพิ่ม `{ provider: "opencode-go", pattern: "muse-spark*", levels: ["minimal", "low", "medium", "high", "xhigh", "max"] }`

**Validation:** `muse-direct-responses` — เทสของ LP-019 ที่ยืนยันว่า opencode-go "unchanged" เปลี่ยนเป็นชุด minimal…max + เทส wire ใหม่ `ocg (max)` → `/zen/go/v1/responses` `reasoning.effort:"max"`
(2 ข้อแดงเมื่อไม่มี fix); full suite เทียบรายข้อ: ไม่มี fail ใหม่
**Deploy + live (2026-10-03 02:0x):** สำรองที่ `/tmp/9router-before-lp027-20261003/` → ปิด server ที่ผู้ใช้เปิดใน ttys006 → ติดตั้ง build `d58788ff` → nohup (logs ปิด)
→ `/v1/responses` stream `ocg/muse-spark-1.3-contributor(max)`: `response.completed` echo `reasoning:{effort:"max"}` ✅; `/v1/messages` `(max)` และ `(xhigh)` 200 ตอบถูก

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream เพิ่มระดับ muse-spark ของ opencode-go เอง → UPSTREAM_FIXED

---

## LP-028 / LP-029 / LP-030: client `/v1/responses` (Codex CLI / Responses SDK) บน muse และ ocg

**Status:** ACTIVE · **Commits:** `df7999a5` (LP-028), `6a389c60` (LP-029), `cb1a19d1` (LP-030) · **Implemented:** 2026-10-03 · พบตอนยืนยัน LP-027
ไม่กระทบ Claude Code (`/v1/messages`) — เฉพาะ client ที่ใช้ `/v1/responses`

**LP-028 — `muse/…(effort)` → 400 `unknown parameter \`reasoning_effort\``:** `MuseExecutor` (LP-018) ย้าย `reasoning_effort` → `reasoning.effort` เฉพาะเมื่อ `input` เป็น array
แต่ Responses API รับ `input` เป็น string ได้ → ข้ามไป → Meta 400 · **แก้:** เงื่อนไขเป็น "มี `input`" · เทส: Responses client `input` string + `(max)` → `reasoning.effort:"max"`

**LP-029 — `muse/…` non-stream ได้ JSON แต่ content-type เป็น SSE:** body รูปแบบเดียวกับ upstream (Responses → Responses) ไม่ผ่าน translator จึงคง `stream:false`
→ Meta ตอบ JSON → `handleForcedSSEToJson` คืน null (ไม่ใช่ SSE) → chatCore ตกไปทาง streaming (เพราะ `forceStream` ทำให้ `stream=true`) แล้วห่อ JSON ด้วย header SSE
**แก้:** ถ้า forced-SSE handler ไม่รับ ให้ใช้ `handleNonStreamingResponse` · เทส: upstream JSON → client ได้ `application/json` `object:"response"`

**LP-030 — `ocg/` model ที่รับเฉพาะ Responses (muse-spark, gpt-6-luna, grok-4.x) non-stream ได้ chat.completion ว่าง:** `OpenCodeGoExecutor` บังคับ `stream:true` ไป upstream
→ ได้ Responses SSE → `handleNonStreamingResponse` ใช้ parser SSE ของ chat อ่านไม่ออก → ว่าง (ทั้ง client Responses, Claude และ OpenAI)
**แก้:** ใน chatCore ถ้า `!stream` + upstream เป็น SSE + `providerResponseFormat === openai-responses` → `handleForcedSSEToJson` (มีตัวแปลง Responses SSE → ทุก client format อยู่แล้ว)
· เทสใหม่ `tests/unit/opencode-go-responses-nonstream.test.js` 3 ข้อ (Responses/Claude/OpenAI client) — แดงทั้ง 3 เมื่อไม่มี fix

**Validation (2026-10-03):** full suite เทียบรายข้อ: ไม่มี fail ใหม่ (pass +5); eslint ผ่าน
**Deploy + live (2026-10-03 02:2x):** สำรองที่ `/tmp/9router-before-lp028-030-20261003/` → ติดตั้ง build `cb1a19d1` → nohup (logs ปิด) → `/v1/responses`:
`muse/…(max)` non-stream `application/json` `object:"response"` echo `effort:"max"` ✅ / stream ✅; `muse/…` non-stream JSON ✅; `ocg/muse-spark…(max)` non-stream ได้ข้อความ ✅ / stream echo `max` ✅;
`cx/gpt-6.1-sol-high` ปกติ; `/v1/messages` ของ `ocg/` และ `muse/` stream + non-stream 200 ตอบถูก
`ocg/gpt-6-luna` บางครั้งยังว่าง — **ไม่ใช่ปัญหาของ patch นี้:** ยิงตรง OpenCode Go 3/6 ครั้งได้ HTTP 200 แล้ว `event: error` `rate_limit_exceeded` (Azure westus3) ทันทีหลัง `response.created` → แก้ฝั่งเราใน LP-031

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream แก้ทาง forceStream/Responses non-stream ใน chatCore เอง → เทียบแล้วประเมินทีละตัว

---

## LP-031: error กลาง stream ของ Responses upstream → client non-stream ได้ 200 ว่าง

**Status:** ACTIVE · **Commit:** `baedc557` · **Implemented:** 2026-10-03 · ต่อจากข้อสังเกตตอนยืนยัน LP-030

**อาการ:** `ocg/gpt-6-luna` แบบ non-stream บางครั้งได้ HTTP 200 `status:"in_progress"` `output:[]` usage 0
**Root cause:** OpenCode Go ตอบ HTTP 200 แล้วส่ง `event: error` `{"type":"too_many_requests","code":"rate_limit_exceeded",…}` (Azure token rate limit) ทันทีหลัง `response.created`
`convertResponsesStreamToJson` ไม่รู้จัก event `error` (และทิ้ง `response.error` ของ `response.failed`) → `handleForcedSSEToJson` ตอบ success → chat.js ไม่เรียก `markAccountUnavailable` → combo ไม่ fallback
**แก้:** converter เก็บ error จาก `error` / `response.failed` (status `failed` + `error`); handler คืน `createErrorResult` — status จาก `error.status` ถ้ามี (400–599),
`rate_limit` / `too_many_requests` → 429, อื่นๆ → 502 · ใช้กับทุก client format (Responses/Claude/OpenAI) และทุก provider ที่ผ่าน Responses SSE→JSON (codex, muse, grok, ocg)
**ขอบเขต:** เฉพาะ client non-stream — client ที่ stream ยังได้ event error ตามที่ upstream ส่ง (ไม่ได้แตะ)

**Tests:** `tests/unit/opencode-go-responses-nonstream.test.js` +2 (rate-limit `error` → 429 ทั้ง 3 client format; `response.failed` → 502) — แดงทั้ง 2 เมื่อไม่มี fix
**Validation (2026-10-03):** full suite เทียบรายข้อ: ไม่มี fail ใหม่ (100 fail เท่าเดิม, pass +2); eslint ผ่าน
**Deploy + live (2026-10-03 02:18):** สำรองที่ `/tmp/9router-before-lp031-20261003/` → ติดตั้ง build `baedc557` → nohup (logs ปิด) → `/v1/responses` `ocg/gpt-6-luna` 6 ครั้ง:
3 ครั้งแรก 200 `completed` ตอบถูก; ครั้งที่ 4 upstream rate limit → ได้ error (account loop ล็อก `modelLock_gpt-6-luna` 2 วิ backoff 1 → client ได้ 503 "all accounts unavailable");
ครั้ง 5–6 ได้ 503 ระหว่าง cooldown — ไม่มี 200 ว่างอีก

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream เพิ่มการจัดการ `error` event ใน `streamToJsonConverter.js` / `sseToJsonHandler.js` เอง → เทียบแล้วตัด patch

---

## LP-032: Session-aware usage — แท็บ Usage › Sessions

**Status:** ACTIVE · **Commit:** `79698992` · **Implemented:** 2026-10-03 · ฟีเจอร์ (ไม่ใช่ bug fix) ตามที่ผู้ใช้ขอ

**เหตุผล:** อยากดูว่า session หนึ่ง (Claude Code main agent + subagent) ใช้ token in/out/cache, ค่าใช้จ่ายแยกตาม model, เวลาที่แต่ละ model ใช้ และเวลารวมของ session เท่าไหร่
ข้อมูลมีเกือบครบอยู่แล้วใน `usageHistory` ขาดแค่ Session ID — และ `extractClientSessionId` (`open-sse/utils/sessionManager.js`) อ่าน session ของ client ได้อยู่แล้ว (ใช้ทำ prompt-cache / สี log) แต่ไม่เคยถูกบันทึก

**แก้:**
- `sessionManager.js` export `extractClientSessionId` — ใช้**เฉพาะ id ที่ client ส่งมา** (`claude:<uuid>` จาก `x-claude-code-session-id` / `metadata.user_id`, Antigravity, `x-session-id`, Codex `prompt_cache_key`/`session_id` ฯลฯ) ไม่ใช้ synthetic fallback (assistant-text hash / per-connection) เพราะจะสร้าง session ปลอม
- `chatCore.js` คำนวณ `usageSessionId` ครั้งเดียว + ใส่ `usageSessionId`, `clientTool` ลง `sharedCtx` → handler ทั้ง 3 (`nonStreaming`, `streaming`, `sseToJson`) ส่ง `sessionId`, `clientTool`, `latency` เข้า `saveUsageStats`
- `usageRepo.saveRequestUsage` เขียนคอลัมน์ใหม่ `usageHistory.sessionId` + `meta` = `{latencyMs, ttftMs, clientTool}` (เดิม `{}` ทุกแถว) — dedup query ไม่เปลี่ยน
- `schema.js`: `sessionId TEXT` + `idx_uh_session(sessionId, timestamp)` (additive ผ่าน `syncSchemaFromTables`) · `SCHEMA_VERSION` 1 → 2 (ได้ backup อัตโนมัติ 1 ครั้งก่อนเพิ่มคอลัมน์)
- ไฟล์ใหม่: `src/lib/usage/sessionUsage.js` (`listSessions` / `getSessionBreakdown`), `src/app/api/usage/sessions/route.js`, `usage/components/SessionsTab.js` + tab entry ใน `usage/page.js`
- เวลาเริ่ม session = `min(timestamp − latencyMs)` เพราะ row ถูก stamp ตอน request **จบ** · "Model time" = ผลรวม latency (ซ้อนกันได้ถ้า subagent รันขนาน จึงอาจเกิน duration)
- ไม่แตะ `requestDetails` / แท็บ Details เลย (`usageHistory` ไม่มีเพดาน 1000 แถว → session ยาวก็ครบ)

**ความปลอดภัย:** `/api/usage/sessions` ไม่อยู่ใน `PUBLIC_API_PATHS` → `dashboardGuard` บังคับ login (ทดสอบแล้วได้ 401 ตอนไม่ login) · คืนเฉพาะยอดรวม ไม่มี prompt/response · SQL แบบ parameterized · `sessionId` cap 256 ตัว, `pageSize` 1–100, วันที่ต้อง parse ได้ · session id เป็นตัวระบุ ไม่ใช่ credential

**ข้อจำกัด:** แถวเก่าก่อน LP-032 มี `sessionId = NULL` → ไม่แสดงในแท็บ (ไม่ backfill) · request ที่ client ไม่ส่ง session id ก็ไม่แสดง (ยังอยู่ใน Overview/Details ตามเดิม)

**Tests:** `tests/unit/usage-session.test.js` 10 ข้อ — `extractClientSessionId` (header, `metadata.user_id` ทั้ง 2 รูปแบบ, ไม่มี id → null) + การรวมยอดต่อ session/ต่อ model, เวลาเริ่ม/wall-clock, กรองช่วงวันที่, ไม่รวมแถว NULL — รันทั้ง driver default (better-sqlite3) และ **sql.js** (ยืนยันว่า `json_extract` ใช้ได้)
**Validation (2026-10-03):** full suite เทียบรายข้อกับรันแบบ stash: ไม่มี fail ใหม่ (100 fail เท่าเดิม, pass +10) · eslint ผ่าน · `npm run build` ผ่าน
**E2E (2026-10-03):** build นี้รันแยกที่ port 20199 + `DATA_DIR` ว่างใน tmp (ไม่แตะ DB จริง) ต่อ upstream เป็น `anthropic-compatible` → gateway จริง `:20128` (ไม่ copy OAuth token)
→ `claude -p` main `9-haiku-level` สั่ง subagent `9-fast-worker` → 3 rows ได้ `claude:1a90c1c6-…` **id เดียวกันทั้ง main และ subagent** · แท็บ Sessions แสดง 1 session / 3 requests / 2 models / duration 10.9s / model time 11.1s, Detail แยก 2 model + Total ตรงกับ DB
(cost เป็น $0 ในการทดสอบนี้เพราะชื่อ combo บน instance ทดสอบไม่มีราคา — ค่า cost มาจาก `calculateCost` เดิมตอนบันทึก)
**Install (2026-10-03 11:13):** สำรอง global + SQLite (`.backup`, integrity ok, 228,322 rows ใน `usageHistory`) ที่ `/tmp/9router-before-lp032-20261003/` (0700/0600) → `npm run cli:pack` (ตรวจ tarball ว่ามี `idx_uh_session`, `usageSessionId`, `/api/usage/sessions`) →
ตรวจว่าไม่มี connection ค้าง → ปิดตัวเดิม (SIGTERM, ไม่ respawn) → `npm install --global ./9router-0.5.95.tgz` → **ยังไม่ start (ผู้ใช้ start เอง)**
ตอน start ครั้งแรก: `syncSchemaFromTables` จะเพิ่มคอลัมน์ `sessionId` + index และ `SCHEMA_VERSION` 2 จะทำ backup อัตโนมัติ 1 ครั้งก่อน
ยืนยันหลัง start: `curl --fail http://127.0.0.1:20128/api/health` → ใช้ Claude Code ผ่าน gateway สักครู่ → แท็บ Usage › Sessions ต้องขึ้น session `claude:<uuid>` ที่มี cost > 0
Rollback: `npm install --global` ทับด้วยของใน backup (แตก `global-9router.tgz` กลับไปที่ `~/.local/lib/node_modules/`) — คอลัมน์ที่เพิ่มไม่ต้องลบ (upstream ไม่อ่าน)

**⚠️ เช็คตอน upgrade รอบหน้า:** ไฟล์ upstream ที่แตะ (แก้ 1–3 บรรทัด/ไฟล์): `chatCore.js` (churn สูงสุด), handler ทั้ง 3, `requestDetail.js` (`saveUsageStats`), `usageRepo.js` (INSERT), `schema.js`, `sessionManager.js` (export), `usage/page.js` (tab)
ถ้า conflict: ให้ upstream ชนะแล้วใส่การส่ง `sessionId/clientTool/latency` กลับ · ถ้า upstream `SCHEMA_VERSION` ขยับเอง ให้ใช้ค่าที่สูงกว่า +1 · ถ้า upstream ทำ session tracking เองให้เทียบแล้วพิจารณา UPSTREAM_FIXED
ตรวจเร็วหลัง upgrade: `cd tests && npx vitest run unit/usage-session.test.js`
**ค้าง:** ขนาด `usageHistory` โตไม่มีเพดาน → ดู "TODO (ต่อจาก LP-032)" ในหัวข้อ Patch ที่ยังไม่ได้แก้
**ปรับ UI (`a4a1c08e`, 2026-10-03):** Drawer Session Details กว้าง 75% ของจอ (`width="full"` + `sm:max-w-[75vw]`; มือถือเต็มจอ) — วัดจริง 1500px→1125px, 1920px→1440px, 390px→390px · แก้เฉพาะ `SessionsTab.js` (deploy 2026-10-03 11:34)
**จำกัดช่วงข้อมูลที่รวมยอด (`4d4150ce`, 2026-10-03):** `usageHistory` ไม่มีการลบข้อมูลเก่า (upstream ไม่มี retention) → query รวมยอดเดิม GROUP BY ทั้งตารางทุกครั้งที่เปิดหน้า
วัดบนสำเนา DB ที่ใส่ sessionId ทุกแถว (228K แถว/11 สัปดาห์): 0.28 วิ → คาดราว 3 วิ/query ที่ 1 ปี (หน้า list รัน 2 query)
แก้: `sessionUsage.js` หา session ที่มี request ในช่วงวันที่ผ่าน `idx_uh_ts` ก่อน (`sessionId IN (subquery)`) แล้วรวมยอดเฉพาะ session เหล่านั้น — ยังนับเต็มทั้ง session ·
`SessionsTab.js` ตั้งค่าเริ่มต้น Start Date = 30 วันล่าสุด (ปุ่มเปลี่ยนเป็น "Reset to last 30 days"; ลบ Start Date เองเพื่อดูทั้งหมด)
ความหมายเปลี่ยนเล็กน้อย: session ที่คร่อมช่วงแต่**ไม่มี request อยู่ในช่วงเลย** ไม่ถูกนับแล้ว (ตรงกับ comment เดิม "any of its requests falls inside the range")
Tests +1 (×2 driver) — แดงกับโค้ดเดิม · eslint + build ผ่าน · query plan: `idx_uh_ts` (subquery) + covering `idx_uh_session` · deploy 2026-10-03 20:22 พร้อม LP-034

---

## LP-033: แท็บ Usage (Overview/Details/Sessions) กดไม่ได้ เมื่อโหลดหน้าด้วย `?tab=`

**Status:** ACTIVE · **Commit:** `f356ce30` · **Implemented:** 2026-10-03 · พบหลัง deploy LP-032 (ผู้ใช้กด Overview/Sessions แล้วไม่เกิดอะไร)

**อาการ:** เปิด `/dashboard/usage?tab=details` ตรงๆ (refresh / bookmark / วาง URL) → กดแท็บไหนก็ไม่เปลี่ยน · ถ้าเข้าจาก sidebar หรือ `/dashboard/usage` ที่ไม่มี query จะกดได้ปกติ
**Root cause:** หน้า usage เป็น static prerender (`○`) — เมื่อ hard-load พร้อม `?tab=` แล้วเรียก `router.push` ไป pathname เดิมแต่ query ต่าง Next ไม่ยิง navigation เลย (ไม่มี RSC request, URL ไม่เปลี่ยน; hydrate ปกติ, onClick มี)
**ไม่ใช่ regression จาก LP-032:** รัน build ก่อน LP-032 (จาก backup `/tmp/9router-before-lp032-20261003/`) ได้อาการเดียวกันเป๊ะ → เป็นพฤติกรรม upstream
**แก้:** `usage/page.js` `handleTabChange` ใช้ `window.history.pushState` แทน `router.push` (Next sync `useSearchParams` กับ History API) — ถอด `useRouter` ที่ไม่ใช้แล้ว
**Validation (2026-10-03):** headless Chromium: hard-load 4 แบบ (`/dashboard/usage`, `?tab=details|sessions|overview`) × กด Sessions→Overview→Details→Sessions + ปุ่ม Back → ผ่านทั้งหมด (ก่อนแก้ 3/4 แบบค้าง) · eslint + build ผ่าน

**Deploy (2026-10-03 11:34):** สำรองที่ `/tmp/9router-before-lp033-20261003/` (global + SQLite, integrity ok) → `cli:pack` (ตรวจ tarball มี `history.pushState` + `max-w-[75vw]`) → รอ connection ค้าง = 0 → ปิดตัวเดิม → `npm install --global` → `launchctl kickstart gui/$(id -u)/com.9router.autostart`
→ `/api/health` 200, instance เดียว, `/api/usage/sessions` ไม่ login = 401 · หลัง restart มี row ใหม่ของ Claude Code ที่มี `sessionId` + cost เข้ามาทันที (LP-032 live: 2 sessions / 12 rows ตอนตรวจ)

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream แก้ `usage/page.js` (เช่นเปลี่ยนเป็น dynamic หรือ Link) ให้ทดสอบ hard-load `?tab=details` แล้วกดแท็บ — ถ้าใช้ได้โดยไม่มี patch → UPSTREAM_FIXED

---

## LP-034: server console log ของ gateway ที่รันจริงหายหมด → เปิด `--log` ใน LaunchAgent + หมุน log

**Status:** ACTIVE · **Commit:** — (ตั้งค่าเครื่อง นอก repo ไม่มีโค้ด 9router เปลี่ยน) · **Implemented:** 2026-10-03 · **Type:** ops/config

**อาการ:** fast-worker ใน session MaeModAI (`claude:00ca4929…`) ใช้ `muse/muse-spark-1.3-contributor(max)` แล้วเจอ "Failed to convert streaming response to JSON" → combo ตกไป `ag/gemini-3.8-flash-high` (10:32 UTC) และ `glm/glm-5.3(max)` (10:44 UTC)
แต่หาสาเหตุจริงไม่ได้ เพราะไม่มี log ที่ไหนเก็บ error นี้ไว้เลย
**Root cause (ของการไม่มี log):**
- `cli.js` spawn server ด้วย `stdio: showLog ? "inherit" : ["ignore","ignore","pipe"]` (`cli/cli.js` ~บรรทัด 630) → ไม่ใส่ `--log` = stdout ถูกทิ้ง, stderr เก็บแค่ใน memory (`crashLog`)
- `/tmp/9router.log` ที่ plist ชี้ไว้จึงมีแค่ banner ของ launcher, `/tmp/9router.error.log` ว่าง
- `requestDetails` บันทึกเฉพาะเมื่อเปิด observability (`requestDetailsRepo.js:145`) และ catch ของ SSE→JSON (`sseToJsonHandler.js:309/390`) มีแค่ `console.error` ไม่ได้ `saveRequestDetail`
- `usageHistory` เก็บเฉพาะ request ที่สำเร็จ
**แก้ (ไม่แตะโค้ด):**
- `~/Library/LaunchAgents/com.9router.autostart.plist`: เพิ่ม `--log` ใน `ProgramArguments`; `StandardOutPath` → `~/.9router/logs/server.log`, `StandardErrorPath` → `~/.9router/logs/server.error.log` (เดิม `/tmp/…` หายตอนรีบูต)
- `~/.9router/bin/rotate-logs.sh` + LaunchAgent `com.9router.logrotate` (ทุก 3600 วิ): ไฟล์เกิน 50 MB → gzip เป็น `.1.gz` เก็บ 5 ชุด แล้ว truncate ไฟล์เดิม
  ใช้ copy-truncate เพราะ launchd เปิดไฟล์ค้างไว้แบบ append — ถ้า rename ไฟล์ launchd จะเขียนต่อลงไฟล์เก่า
- สำรอง plist เดิม: `~/.9router/com.9router.autostart.plist.bak-20261003`
**Validation (2026-10-03):** `plutil -lint` ผ่านทั้ง 2 plist · ทดสอบสคริปต์ใน sandbox ด้วย writer แบบ `>>` ที่เปิดไฟล์ค้าง: หมุนแล้วไม่มีบรรทัดหาย ไม่มี null byte, writer เขียนต่อหลัง truncate ได้ · `com.9router.logrotate` โหลดแล้ว (run interval 3600) · gateway ตัวที่รันอยู่ไม่ถูกแตะ (pid เดิม)
**ยังไม่ apply กับ gateway ที่รันอยู่** — launchd อ่าน plist ใหม่เฉพาะตอนโหลด job ใหม่ (`kickstart` อย่างเดียวไม่พอ) และการ reload จะตัด request ที่วิ่งอยู่ → ผู้ใช้ขอให้รองานค้างเสร็จก่อน:
```bash
launchctl bootout gui/$(id -u)/com.9router.autostart; sleep 2; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.9router.autostart.plist
```
ยืนยันหลัง reload: `launchctl print gui/$(id -u)/com.9router.autostart | grep "stdout path"` ต้องเป็น `~/.9router/logs/server.log` และ `tail -f ~/.9router/logs/server.log` ต้องเห็นบรรทัด request
**Apply + live (2026-10-03 20:22):** รองานค้างเสร็จตามที่ผู้ใช้สั่ง → `cli:pack` (`4766c640`) → สำรองที่ `/tmp/9router-before-lp034-20261003/` (global + SQLite, integrity ok, 229,010 rows)
→ ไม่มี Claude Code ต่อค้าง (เหลือแท็บ dashboard + dev server ai-business-os-fable) → `bootout` (ทั้ง 2 process ออก, port ว่าง) → `npm install --global` → `bootstrap`
→ `/api/health` 200, instance เดียว, `/api/usage/sessions` ไม่ login = 401 · `launchctl print`: args มี `--log`, stdout = `~/.9router/logs/server.log`
→ ยิง `9-haiku-level` 1 ครั้ง: log มีบรรทัด `[COMBO] Trying model 1/3` / `succeeded` / `DONE 1993ms` และ usage row มี `sessionId` + latency
Rollback: `cp ~/.9router/com.9router.autostart.plist.bak-20261003 ~/Library/LaunchAgents/com.9router.autostart.plist` แล้ว bootout/bootstrap · ถอดตัวหมุน log: `launchctl bootout gui/$(id -u)/com.9router.logrotate` + ลบ plist/สคริปต์

**ความปลอดภัย:** log อยู่ใน home ของผู้ใช้ (ไม่ใช่ `/tmp` ที่ทุก user อ่านได้) · console log ของ server เป็นบรรทัดสรุป request/error — ไม่ใช่ request log เต็ม (`ENABLE_REQUEST_LOGS` ยังปิด ไม่มี `x-api-key`)
แต่บรรทัด request มีอีเมลบัญชี upstream (`ACC:…`) และข้อความ error จาก upstream อาจมีเนื้อหาบางส่วนของ prompt → อย่าแชร์ไฟล์ log ทั้งไฟล์ออกไปข้างนอก

**⚠️ เช็คตอน upgrade / เปลี่ยนเครื่อง:**
- **เมนู tray "Enable Auto-start"** (`cli/src/cli/tray/autostart.js` `enableMacOS`) **เขียน plist ใหม่ทับ** — กลับเป็น `--tray --skip-update` + log `/tmp` → ถ้ากด Disable/Enable Auto-start ต้องใส่ LP-034 กลับ
- ถ้า upstream เปลี่ยนชื่อ/ความหมายของ `--log` ใน `cli.js` หรือเพิ่ม log file ของตัวเอง → เทียบแล้วพิจารณา UPSTREAM_FIXED (ถอด `--log` + ตัวหมุน log)
- การอัปเดต npm global (`npm install --global ./9router-*.tgz`) ไม่แตะ plist — ไม่ต้องทำอะไร

---

## LP-035: stream stall timeout ไม่บอกว่า upstream ส่งมาถึงไหนก่อนเงียบ

**Status:** ACTIVE · **Commit:** `63a96737` · **Implemented:** 2026-10-04 · ต่อจาก LP-034 (log ใหม่เห็น error แล้วแต่ไม่มีรายละเอียด)

**อาการ:** 2026-10-03 21:53:50 fast-worker ใน session MaeModAI (`claude:00ca4929…`) → `muse/muse-spark-1.3-contributor(max)` ได้ HTTP 200 แล้วเงียบ → log มีแค่
`✗ ERROR: stream stall timeout · muse/… · 384312ms` + stack ของ timer (ไม่บอกอะไร) — muse ไม่ส่ง error มาเลย จึงไม่มี body ให้ดู
(งานไม่เสีย: request ที่ค้างเป็นตัวที่ยิงขนาน — fast-worker ส่ง DONE ไปแล้ว 21:47:44) · น่าจะเป็นอาการเดียวกับ "Failed to convert streaming response to JSON" ที่เจอก่อนหน้า (upstream เงียบกลาง stream)
**Root cause (ของการไม่มีรายละเอียด):** `pipeWithDisconnect` (`streamHandler.js:211`) มีบรรทัด `STALL TIMEOUT … | chunks | bytes | sinceLast` อยู่แล้ว แต่ส่งผ่าน `dbg()` ซึ่งทำงานเฉพาะ `NODE_ENV !== "production"` (`debugLog.js:3`) → gateway จริงไม่พิมพ์
**แก้:** เปลี่ยนเฉพาะบรรทัดนั้นเป็น `console.warn` รูปแบบเดียวกับ log อื่น + เพิ่ม `dur` → ไปลง `~/.9router/logs/server.error.log` (stderr, LP-034):
`[HH:MM:SS] ⚠️  [STREAM] STALL TIMEOUT 360000ms | chunks=N | bytes=N | sinceLast=Nms | dur=Nms`
อ่านคู่กับบรรทัด `✗ ERROR: stream stall timeout · <provider>/<model>` ที่เวลาเดียวกันใน `server.log` · `dbg` อื่นในไฟล์ไม่แตะ
ไม่ได้เปลี่ยนเวลา timeout (`STREAM_STALL_TIMEOUT_MS` = 360 วิ เดิม)

**Tests:** `tests/unit/responses-abort-terminal.test.js` +1 (stall ผ่าน `pipeWithDisconnect` 50ms → `console.warn` มี `chunks=1 | bytes=10 | sinceLast | dur`) — แดงกับโค้ดเดิม
**Validation (2026-10-04):** full suite เทียบรายข้อกับ HEAD เดิม: ไม่มี fail ใหม่ (100 fail เท่าเดิม, pass +1) · eslint ผ่าน
**Deploy:** ยังไม่ทำ — ผู้ใช้ขอให้รอสั่งก่อนรีสตาร์ต (ติดตั้ง global ตอน server รันอยู่ไม่ได้ เพราะ chunk ของ Next จะไม่ตรงกับ process ที่รัน)

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream เปลี่ยน log ของ stall ใน `pipeWithDisconnect` ให้พิมพ์ใน production เอง → UPSTREAM_FIXED

---

## LP-036: Muse Spark cache ต่ำ (~52%) เพราะไม่ได้ส่ง `prompt_cache_key`

**Status:** ACTIVE · **Commit:** `26267bb5` · **Implemented:** 2026-10-04 · พบจากแท็บ Sessions (LP-032)

**อาการ:** session MaeModAI `claude:00ca4929…` — `muse-spark-1.3-contributor(max)` 630 requests: input 177.8M, cached 93.0M (**52%**) ขณะที่ปกติควร 90%+
แยกราย request แล้วเป็นสองขั้ว: 261 ครั้ง ≥90%, 82 ครั้ง 50–90%, **287 ครั้ง = 0 พอดี** สลับกันไปมา (บัญชี muse มีบัญชีเดียว → ไม่ใช่การสลับบัญชี)
request ที่ cache 0 ใช้เวลานานกว่า (13–20 วิ เทียบ 5–8 วิ) และเสียเงินเต็มราคา input
**Root cause:** Muse (Meta Model API, `/v1/responses`) กระจาย request ไปหลาย cache node ถ้าไม่มี `prompt_cache_key` ช่วยปักให้ไปที่เดิม
`CodexExecutor` ใส่ `prompt_cache_key` ให้เอง (`codex.js:478`) แต่ `MuseExecutor` ไม่ได้ใส่ · billing header ของ Claude Code (`cch=` ที่เปลี่ยนทุก request) ถูกตัดอยู่แล้ว (`claude-to-openai.js:10`) จึงไม่ใช่สาเหตุ
**พิสูจน์ (2026-10-04, ผ่าน gateway จริง):** prompt เดิม ~12.4K token ยิง 8 ครั้งติดกัน → **ไม่มี key: cached 1/8** · **มี key: cached 7/8** (ครั้งแรกเป็นการเขียน cache)
**แก้:** `MuseExecutor.transformRequest` ใส่ `prompt_cache_key = resolveSessionId({ headers: credentials.rawHeaders, body, connectionId, scope: "muse" })` เมื่อ client ไม่ได้ส่งมาเอง
(Claude Code → `claude:<uuid>` จาก `x-claude-code-session-id`; ไม่มี session → key คงที่ต่อ connection) — วิธีเดียวกับ Codex
**ความปลอดภัย:** key คือ session UUID แบบสุ่มของ Claude Code (Codex ส่งแบบเดียวกันอยู่แล้ว) ไม่ใช่ credential และไม่มีข้อมูลส่วนตัว

**Tests:** `tests/unit/muse-direct-responses.test.js` +3 (key จาก session ของ Claude Code / เก็บ key ที่ client ส่งเอง / fallback คงที่ต่อ connection) — 2 ข้อแดงกับโค้ดเดิม
**Validation (2026-10-04):** full suite เทียบรายข้อ: ไม่มี fail ใหม่ (100 fail เท่าเดิม, pass +3) · eslint ผ่าน
**Deploy:** ยังไม่ทำ — รอผู้ใช้สั่ง (รวมรอบเดียวกับ LP-035) · ยืนยันหลัง deploy: แท็บ Sessions › Detail ของ session ใหม่ที่ใช้ muse → Cached/Input ควร ≥ ~90% และไม่มีแถว cached 0 ติดกันเป็นชุด

**⚠️ เช็คตอน upgrade รอบหน้า:** ถ้า upstream ใส่ `prompt_cache_key` ให้ muse (หรือ DefaultExecutor) เอง → UPSTREAM_FIXED · provider อื่นที่เป็น Responses แต่ไม่ใช่ Codex อาจมีปัญหาเดียวกัน (ยังไม่ได้วัด)

---

## Patch ที่ยังไม่ได้แก้ (รอตัดสินใจ)

### TODO (ต่อจาก LP-032): ขนาด `usageHistory` โตไม่มีเพดาน — ทบทวนราว ม.ค.–ก.พ. 2027

**สถานะ:** ยังไม่ทำ (ผู้ใช้ขอให้จดไว้ก่อน 2026-10-03) · ทำไปแล้วเฉพาะเรื่อง**ความเร็ว** (`4d4150ce` จำกัดช่วงวันที่ก่อนรวมยอด) — **ขนาด DB ยังไม่ได้แก้**

**ตัวเลขตอนจด (2026-10-03):** `data.sqlite` 144 MB · `usageHistory` 228K แถว (เริ่ม 2026-07-15) · ราว 6,300 แถว/วัน
- upstream เอง: ~460 bytes/แถว (ข้อมูล + index) ≈ 2.9 MB/วัน ≈ 1 GB/ปี — **upstream ไม่มี retention เลย** (ไม่มี `DELETE FROM usageHistory` ที่ไหน)
- ส่วนที่ LP-032 เพิ่ม (`sessionId` + `meta` + `idx_uh_session`): ~155 bytes/แถว ≈ 1 MB/วัน ≈ 370 MB/ปี (+34%)

**ทางเลือกที่ยังไม่ได้ทำ:**
1. **Partial index** — `idx_uh_session` ตอนนี้ 7.5 MB ทั้งที่มีแถวที่มี sessionId แค่หลักร้อย เพราะแถว NULL (ข้อมูลก่อน LP-032) ถูก index ด้วย
   แก้: `CREATE INDEX … ON usageHistory(sessionId, timestamp) WHERE sessionId IS NOT NULL` — ต้องแตะ `src/lib/db/schema.js` (ไฟล์ upstream) + drop index เดิม
   ประโยชน์ลดลงเรื่อยๆ เพราะแถวใหม่มี sessionId เกือบทั้งหมด → คุ้มเฉพาะถ้าอยากคืนพื้นที่ส่วน NULL
2. **Retention** (แก้ที่ต้นเหตุ) — ลบ/ย้ายแถว `usageHistory` เก่ากว่า N เดือน (เช่น 12) ด้วย job แยก
   ⚠️ กระทบของ upstream: แท็บ Overview/Details, `scripts/backfill-usage-cost.mjs` (LP-012) และยอดย้อนหลัง — ต้องเช็คก่อนว่า Overview อ่าน `usageDaily` (ยอดรวมรายวัน) หรือ `usageHistory` ช่วงไหน
   ทางที่ปลอดภัยกว่า: archive ไปไฟล์ SQLite แยกก่อนลบ · ต้อง `VACUUM` หลังลบถึงจะคืนพื้นที่ไฟล์ (ทำตอน gateway หยุด)
3. ถ้า upstream เพิ่ม retention / ลบข้อมูลเก่าเอง → เทียบแล้วปิด TODO นี้

**ตอนกลับมาทำ:** วัดใหม่ก่อน — `du -h ~/.9router/db/data.sqlite` และ `sqlite3 -readonly ~/.9router/db/data.sqlite "select name, sum(pgsize)/1048576.0 from dbstat group by name order by 2 desc limit 8;"`
ความเร็วแท็บ Sessions ไม่ต้องห่วงแล้ว (คงที่ ~0.2 วิ ตามช่วง 30 วัน) — เรื่องนี้เป็นเรื่องพื้นที่ดิสก์อย่างเดียว

### Bug A → แก้แล้วเป็น LP-026 (ดูหัวข้อ LP-026 ด้านบน) — บันทึกเดิม:

#### Bug A: `reason` injection ใน tool schema ว่าง (gemini/antigravity path)

**สถานะ:** NEEDS_REVIEW — ประเด็นเดิมที่ยังไม่ได้แก้ · **ไฟล์:** `open-sse/translator/formats/gemini.js`, `cleanJSONSchemaForAntigravity()`

**ตรวจซ้ำ v0.5.91 (2026-09-28):** ยังเหมือนเดิมทุกอย่าง — `cleanJSONSchemaForAntigravity({type:"object",properties:{}})` คืน `properties.reason` + `required:["reason"]` (`gemini.js:401,406,413,418`) upstream ไม่แก้ในรอบนี้

**ตรวจซ้ำ v0.5.86 (2026-09-24):** การเรียก cleaner ด้วย `{type: "object", properties: {}}` ยังได้ `properties.reason` และ `required: ["reason"]`; ยืนยันได้ในระดับ schema transformation รอบนี้ ไม่ได้รัน live Gemini tool-call เพื่อยืนยัน error ฝั่ง Claude Code ซ้ำ ควรแยกแก้และทดสอบ empty-tool round-trip ก่อนปิดประเด็น

- `cleanJSONSchemaForAntigravity` ฝัง `reason` เป็น **required** field ลง tool ที่ schema ว่าง (เช่น `TaskList`)
- model เห็น schema บอก `reason` required → ส่ง `{"reason":"..."}` กลับมา
- ฝั่ง response (`openai-to-claude.js`) ไม่ strip → Claude Code ตีตก `InputValidationError: unexpected parameter 'reason'`

**ทางแก้ที่เลือกไว้:** ตัด `obj.required = ["reason"]` (ทำให้เป็น optional) หรือ strip `reason` ตอน response
**หมายเหตุ:** upstream v0.5.45 ขยาย injection ให้ครอบคลุม schema ว่าง `{}` มากขึ้น (commit `e3e3e235`) — bug ยังอยู่และกว้างขึ้น

### Bug C: grok-cli non-stream บน `/v1/messages` คืน body รูปแบบ OpenAI

**สถานะ:** แก้แล้ว 2026-10-01 → ย้ายไปเป็น **LP-016** (commit `8f7c6cde`) ดูรายละเอียดด้านบน

### Bug E → แก้แล้วเป็น LP-022 (ดูหัวข้อ LP-022 ด้านบน)

### Bug D → แก้แล้วเป็น LP-024 (ดูหัวข้อ LP-024 ด้านบน) — บันทึกเดิม:

#### Bug D: antigravity non-stream บน `/v1/messages` คืน body รูปแบบ OpenAI

**สถานะ:** NEEDS_REVIEW — พบระหว่าง live probe หลังอัปเดต v0.5.95 (2026-10-02), ยังไม่ได้วิเคราะห์ root cause (นอกขอบเขต upgrade)

- `POST /v1/messages` + `ag/gemini-3.8-flash` (หรือ combo `9-fast-worker` ที่ตกไป antigravity) + `stream:false` → `content-type: application/json`
  แต่ body เป็น `{"object":"chat.completion","choices":[...]}` แทน `{"type":"message",...}` — อาการเดียวกับ Bug C/LP-016 แต่คนละเส้นทาง (ไม่ใช่ `handleForcedSSEToJson` ของ grok/codex)
- stream ปกติ → **ไม่กระทบ Claude Code**; กระทบเฉพาะ client non-stream
- ยังไม่ได้เทียบกับ v0.5.91 / upstream เปล่า — ตรวจก่อนแก้ (อาจเป็น CASE A); ดู LP-016 เป็นแนวทาง (`openAICompletionToClaudeMessage`)
