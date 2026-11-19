// LP-004: the real Claude Code client version must reach Anthropic. Upstream
// 43bc940e (v0.5.119) rewrites every outbound claude-cli/x.y.z to the npm
// "latest" it last saw (6h cache, 2.1.322 floor when npm is unreachable). A
// client that auto-updated past that value would be sent upstream as an older
// version and trip "claude_code_version_too_old" on a newly gated model.
import { describe, expect, it } from "vitest";

import { applyClaudeCliVersion, getClaudeCliVersion } from "../../open-sse/utils/claudeCliVersion.js";

const bump = (version, by) => {
  const [a, b, c] = version.split(".").map(Number);
  return `${a}.${b}.${c + by}`;
};

describe("applyClaudeCliVersion (LP-004)", () => {
  it("upgrades a stale bundled fingerprint to the live version", () => {
    const live = getClaudeCliVersion();
    const out = applyClaudeCliVersion({ "User-Agent": "claude-cli/1.0.0 (external, cli)" });
    expect(out["User-Agent"]).toBe(`claude-cli/${live} (external, cli)`);
  });

  it("never lowers a newer client version", () => {
    const newer = bump(getClaudeCliVersion(), 7);
    const out = applyClaudeCliVersion({ "User-Agent": `claude-cli/${newer} (external, cli)` });
    expect(out["User-Agent"]).toBe(`claude-cli/${newer} (external, cli)`);
  });

  it("keeps a newer client version in Headers and tuple forms too", () => {
    const newer = bump(getClaudeCliVersion(), 3);
    const headers = new Headers({ "user-agent": `claude-cli/${newer} (external, cli)` });
    expect(applyClaudeCliVersion(headers).get("user-agent")).toBe(`claude-cli/${newer} (external, cli)`);
    const tuples = applyClaudeCliVersion([["user-agent", `claude-cli/${newer}`]]);
    expect(tuples[0][1]).toBe(`claude-cli/${newer}`);
  });
});
