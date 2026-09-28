# tests/unit/grok-cli-quota-frame.test.js

- encodeVarint · function · L12-L22 — function encodeVarint(value)
- encodeTag · function · L24-L26 — function encodeTag(fieldNumber, wireType)
- encodeFixed32Field · function · L28-L32 — function encodeFixed32Field(fieldNumber, value)
- encodeLengthDelimited · function · L34-L36 — function encodeLengthDelimited(fieldNumber, body)
- encodeVarintField · function · L38-L40 — function encodeVarintField(fieldNumber, value)
- encodeTimestampField · function · L42-L47 — function encodeTimestampField(fieldNumber, seconds, nanos)
- encodeCreditsInfo · function · L49-L59 — function encodeCreditsInfo(shape)
- encodeTopLevelMessage · function · L61-L63 — function encodeTopLevelMessage(creditsInfo)
- frameData · function · L65-L70 — function frameData(payload)
- frameTrailer · function · L72-L78 — function frameTrailer(statusText = "grpc-status:0\r\n")
- isoFromEpoch · function · L87-L89 — function isoFromEpoch(seconds, nanos)
