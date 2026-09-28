# open-sse/services/usage/grokCliQuotaFrame.js

- probeFrameHeader · function · L31-L39 — function probeFrameHeader(buffer, offset = 0)
- readVarint · function · L41-L55 — function readVarint(buffer, offset)
- readLengthDelimitedField · function · L57-L66 — function readLengthDelimitedField(buffer, offset)
- readFixedWidthField · function · L68-L74 — function readFixedWidthField(buffer, offset, width, wireType)
- readField · function · L76-L105 — function readField(buffer, offset)
- decodeFields · function · L107-L117 — function decodeFields(buffer)
- findDataFramePayload · function · L119-L132 — function findDataFramePayload(buffer)
- extractNestedMessage · function · L134-L137 — function extractNestedMessage(field)
- extractUsageRatio · function · L139-L144 — function extractUsageRatio(field)
- extractResetAt · function · L146-L160 — function extractResetAt(field)
- decodeGrokCreditsFrame · function · L167-L191 — function decodeGrokCreditsFrame(buffer)
