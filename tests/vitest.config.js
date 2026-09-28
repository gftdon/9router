import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Point the whole run at a throwaway data dir. src/lib/dataDir.js falls back to
// ~/.9router when DATA_DIR is unset, so any test that reaches the db layer
// without isolating itself writes into the user's live gateway database — that
// is how stray "zed" OAuth connections and ~140 openai-compatible-* fixture
// rows kept reappearing in the dashboard after a plain `npx vitest run`.
// Individual files that set DATA_DIR themselves still override this.
const TEST_DATA_DIR = mkdtempSync(join(tmpdir(), "9router-test-"));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: { DATA_DIR: TEST_DATA_DIR },
    include: ["**/*.test.js"],
    // Don't scan into git worktrees nested under .claude/ — they carry their
    // own copies of the test files but lack an installed node_modules (open-sse,
    // etc.), which makes provider imports fail during collection.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/dist/**"],
    // Allow many it.concurrent cases (real provider smoke runs ~50 providers in parallel)
    maxConcurrency: 60,
    // Suppress noisy console output from handlers under test
    silent: false,
  },
  resolve: {
    // Use array form so subpath aliases (e.g. "@/lib/db/index.js") resolve correctly.
    alias: [
      { find: /^open-sse\//, replacement: resolve(__dirname, "../open-sse") + "/" },
      { find: "open-sse", replacement: resolve(__dirname, "../open-sse") },
      { find: /^@\//, replacement: resolve(__dirname, "../src") + "/" },
    ],
  },
});
