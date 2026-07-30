# Local Patches — สิ่งที่แก้เองนอกเหนือจาก upstream

> เอกสารนี้บันทึก patch ที่เราแก้เองบน fork (`gftdon/9router`) แต่ยังไม่ได้ขึ้น upstream (`decolua/9router`)
> **ทุกครั้งที่อัปเดต 9router เวอร์ชันใหม่ ให้เช็คไฟล์นี้ก่อน** — ถ้า patch ถูกเขียนทับ ให้ re-apply ตามขั้นตอนด้านล่างของแต่ละเคส

---

## Patch 1: GLM-5.2 contextWindow ผิดทำให้ autocompact thrash เร็วผิดปกติ

**Commit:** `b55f405e` · **ไฟล์ที่แก้:** `open-sse/providers/capabilities.js` · **วันที่:** 2026-07-30

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

```bash
npm run build
cd cli && npm install && cd ..
npm run cli:pack          # ได้ 9router-<ver>.tgz ที่ ../
npm install -g ../9router-<ver>.tgz
# ยืนยัน fix ใน global bundle:
grep -o '"glm-5.2":{reasoning:!0,thinkingFormat:"zai",contextWindow:1e6' \
  ~/.local/lib/node_modules/9router/app/.next-cli-build/server/chunks/*.js
# แล้วรีสตาร์ท 9router (kill process เดิมแล้วเปิดใหม่)
```

---

## Patch 2: combo ที่มี `[1m]` suffix ไม่ resolve ทำให้ sub-agent ไม่ได้ 1M window

**Commit:** `0bb6cc65` · **ไฟล์ที่แก้:** `src/sse/services/model.js` · **วันที่:** 2026-07-30

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

### วิธีใช้ (ฝั่ง client)

ตั้ง sub-agent ให้ใช้ combo ที่มี `[1m]` ต่อท้าย เพื่อให้ได้ 1M window:
```json
"ANTHROPIC_DEFAULT_SONNET_MODEL": "9-fast-worker[1m]"
```
(ใน `~/.claude/settings.json`) — sub-agent ที่ route ผ่าน sonnet tier จะได้ 1M window แทน 200K

### วิธีเช็คว่า patch ยังอยู่

```bash
grep -q 's\*1m' ~/.local/lib/node_modules/9router/app/.next-cli-build/server/chunks/*.js \
  && echo "PATCH OK" || echo "PATCH LOST — re-apply"
# หรือยิงเทส: model "9-fast-worker[1m]" ต้องตอบ ไม่ใช่ model_not_found
```

---

## Patch ที่ยังไม่ได้แก้ (รอตัดสินใจ)

### Bug A: `reason` injection ใน tool schema ว่าง (gemini/antigravity path)

**สถานะ:** ยืนยัน root cause แล้ว ยังไม่ได้แก้ · **ไฟล์:** `open-sse/translator/formats/gemini.js:353-378`

- `cleanJSONSchemaForAntigravity` ฝัง `reason` เป็น **required** field ลง tool ที่ schema ว่าง (เช่น `TaskList`)
- model เห็น schema บอก `reason` required → ส่ง `{"reason":"..."}` กลับมา
- ฝั่ง response (`openai-to-claude.js`) ไม่ strip → Claude Code ตีตก `InputValidationError: unexpected parameter 'reason'`

**ทางแก้ที่เลือกไว้:** ตัด `obj.required = ["reason"]` (ทำให้เป็น optional) หรือ strip `reason` ตอน response
**หมายเหตุ:** upstream v0.5.45 ขยาย injection ให้ครอบคลุม schema ว่าง `{}` มากขึ้น (commit `e3e3e235`) — bug ยังอยู่และกว้างขึ้น
