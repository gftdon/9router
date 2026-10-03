"use client";

// Sessions tab (LP-032): usage grouped by client session id — Claude Code main
// agent + subagents share one id. Data from /api/usage/sessions (aggregates only).
import { useState, useEffect } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

const CLIENT_LABELS = {
  claude: "Claude Code",
  codex: "Codex",
  "gemini-cli": "Gemini CLI",
  antigravity: "Antigravity",
  "github-copilot": "GitHub Copilot",
  "deepseek-tui": "DeepSeek TUI",
};

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed((n || 0) > 0 && n < 1 ? 4 : 2)}`;
const dash = (n) => (n > 0 ? fmt(n) : "—");

function fmtDuration(ms) {
  const v = Math.max(0, Math.round(ms || 0));
  if (v < 1000) return `${v}ms`;
  const totalSec = Math.floor(v / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${(v / 1000).toFixed(1)}s`;
}

function clientLabel(tool) {
  return CLIENT_LABELS[tool] || tool || "Unknown";
}

// "claude:1b2c…" → "1b2c3d4e" for compact display; full id stays in title/copy
function shortSessionId(id) {
  const raw = String(id || "");
  const bare = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  return bare.length > 12 ? `${bare.slice(0, 8)}…` : bare;
}

let providerNodesCache = null;

async function fetchProviderNodes() {
  if (providerNodesCache) return providerNodesCache;
  const res = await fetch("/api/provider-nodes");
  const data = await res.json();
  providerNodesCache = {};
  for (const node of data.nodes || []) providerNodesCache[node.id] = node.name;
  return providerNodesCache;
}

function getProviderName(providerId, nodes) {
  if (!providerId) return providerId;
  if (nodes?.[providerId]) return nodes[providerId];
  const config = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return config?.name || providerId;
}

function StatCard({ label, value, hint }) {
  return (
    <Card padding="md">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
        <span className="truncate font-mono text-xl font-semibold text-text-main">{value}</span>
        {hint && <span className="truncate text-xs text-text-muted">{hint}</span>}
      </div>
    </Card>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy session ID"
      className="inline-flex items-center text-text-muted hover:text-text-main"
    >
      <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
    </button>
  );
}

const TH = "px-3 py-4 text-sm font-semibold text-text-main whitespace-nowrap";
const TD_NUM = "px-3 py-4 text-sm text-text-main text-right font-mono whitespace-nowrap";

export default function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [providerNodes, setProviderNodes] = useState(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState("");

  useEffect(() => {
    fetchProviderNodes().then(setProviderNodes).catch(() => {});
  }, []);

  // Loading is derived (requested key vs loaded key) so the effect never sets state synchronously
  const requestKey = JSON.stringify({ page: pagination.page, pageSize: pagination.pageSize, ...filters });
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const { page, pageSize, startDate, endDate } = JSON.parse(requestKey);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    fetch(`/api/usage/sessions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSessions(data.sessions || []);
        setTotals(data.totals || null);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      })
      .catch((error) => console.error("Failed to fetch sessions:", error))
      .finally(() => { if (!cancelled) setLoadedKey(requestKey); });

    return () => { cancelled = true; };
  }, [requestKey]);

  const handleViewDetail = async (sessionId) => {
    setIsDrawerOpen(true);
    setBreakdown(null);
    setBreakdownError("");
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/usage/sessions?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load session");
      setBreakdown(data);
    } catch (error) {
      setBreakdownError(error.message);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ startDate: "", endDate: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const showReasoning = (breakdown?.totals?.reasoningTokens || 0) > 0;

  const inputClass = cn(
    "h-9 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-surface",
    "w-full min-w-0 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card padding="md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="sessions-start-date" className="text-sm font-medium text-text-main">Start Date</label>
            <input
              id="sessions-start-date"
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="sessions-end-date" className="text-sm font-medium text-text-main">End Date</label>
            <input
              id="sessions-end-date"
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span className="hidden text-sm font-medium text-text-main opacity-0 lg:block" aria-hidden="true">Clear</span>
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              disabled={!filters.startDate && !filters.endDate}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {totals && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Sessions" value={fmt(totals.sessions)} hint={`${fmt(totals.requests)} requests`} />
          <StatCard label="Input" value={fmt(totals.promptTokens)} hint={`cached ${fmt(totals.cachedTokens)}`} />
          <StatCard label="Output" value={fmt(totals.completionTokens)} />
          <StatCard label="Cost" value={fmtCost(totals.cost)} />
          <StatCard label="Model time" value={fmtDuration(totals.durationMs)} />
        </div>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className={cn(TH, "text-left")}>Last Active</th>
                <th className={cn(TH, "text-left")}>Session</th>
                <th className={cn(TH, "text-right")}>Duration</th>
                <th className={cn(TH, "text-right")}>Requests</th>
                <th className={cn(TH, "text-right")}>Input</th>
                <th className={cn(TH, "text-right")}>Cached</th>
                <th className={cn(TH, "text-right")}>Cache Creation</th>
                <th className={cn(TH, "text-right")}>Output</th>
                <th className={cn(TH, "text-right")}>Cost</th>
                <th className={cn(TH, "text-right")}>Model Time</th>
                <th className={cn(TH, "text-center")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-text-muted">
                    No sessions found. Requests are grouped once a client sends a session ID (e.g. Claude Code).
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr
                    key={s.sessionId}
                    className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-text-main">
                      {new Date(s.lastAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-4 text-sm text-text-main">
                      <div className="flex flex-col gap-0.5">
                        <span className="whitespace-nowrap font-medium">{clientLabel(s.clientTool)}</span>
                        <span className="flex items-center gap-1 font-mono text-xs text-text-muted" title={s.sessionId}>
                          {shortSessionId(s.sessionId)}
                          <CopyButton text={s.sessionId} />
                        </span>
                      </div>
                    </td>
                    <td className={TD_NUM}>{fmtDuration(s.wallClockMs)}</td>
                    <td className={TD_NUM}>
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{fmt(s.requests)}</span>
                        <span className="font-sans text-xs text-text-muted">{s.modelCount} {s.modelCount === 1 ? "model" : "models"}</span>
                      </div>
                    </td>
                    <td className={TD_NUM}>{fmt(s.promptTokens)}</td>
                    <td className={TD_NUM}>{dash(s.cachedTokens)}</td>
                    <td className={TD_NUM}>{dash(s.cacheCreationTokens)}</td>
                    <td className={TD_NUM}>{fmt(s.completionTokens)}</td>
                    <td className={TD_NUM}>{fmtCost(s.cost)}</td>
                    <td className={TD_NUM}>{fmtDuration(s.durationMs)}</td>
                    <td className="px-3 py-4 text-center">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetail(s.sessionId)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && sessions.length > 0 && (
          <div className="border-t border-black/5 dark:border-white/5">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              onPageSizeChange={(pageSize) => setPagination((prev) => ({ ...prev, pageSize, page: 1 }))}
            />
          </div>
        )}
      </Card>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Session Details" width="full" className="sm:max-w-[75vw]">
        {breakdownLoading && (
          <div className="flex items-center justify-center gap-2 p-8 text-text-muted">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            Loading...
          </div>
        )}
        {breakdownError && <div className="p-4 text-sm text-red-600">{breakdownError}</div>}
        {breakdown && (
          <div className="space-y-6">
            <div className="grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-text-muted">Session ID:</span>{" "}
                <span className="break-all font-mono text-text-main">{breakdown.sessionId}</span>{" "}
                <CopyButton text={breakdown.sessionId} />
              </div>
              <div>
                <span className="text-text-muted">Client:</span>{" "}
                <span className="font-medium text-text-main">{clientLabel(breakdown.clientTool)}</span>
              </div>
              <div>
                <span className="text-text-muted">Requests:</span>{" "}
                <span className="font-mono text-text-main">{fmt(breakdown.totals.requests)}</span>
              </div>
              <div>
                <span className="text-text-muted">Started:</span>{" "}
                <span className="text-text-main">{new Date(breakdown.firstAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-text-muted">Last active:</span>{" "}
                <span className="text-text-main">{new Date(breakdown.lastAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-text-muted">Session duration:</span>{" "}
                <span className="font-mono text-text-main">{fmtDuration(breakdown.wallClockMs)}</span>
              </div>
              <div>
                <span className="text-text-muted">Model time:</span>{" "}
                <span className="font-mono text-text-main">{fmtDuration(breakdown.totals.durationMs)}</span>
              </div>
              <div>
                <span className="text-text-muted">Total cost:</span>{" "}
                <span className="font-mono font-semibold text-text-main">{fmtCost(breakdown.totals.cost)}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-black/5 dark:border-white/5">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                    <th className={cn(TH, "text-left")}>Model</th>
                    <th className={cn(TH, "text-right")}>Requests</th>
                    <th className={cn(TH, "text-right")}>Input</th>
                    <th className={cn(TH, "text-right")}>Cached</th>
                    <th className={cn(TH, "text-right")}>Cache Creation</th>
                    <th className={cn(TH, "text-right")}>Output</th>
                    {showReasoning && <th className={cn(TH, "text-right")}>Reasoning</th>}
                    <th className={cn(TH, "text-right")}>Cost</th>
                    <th className={cn(TH, "text-right")}>Time Used</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.models.map((m) => (
                    <tr key={`${m.provider}/${m.model}`} className="border-b border-black/5 dark:border-white/5">
                      <td className="max-w-[220px] px-3 py-4 text-sm text-text-main">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-mono" title={m.model}>{m.model}</span>
                          <span className="truncate text-xs text-text-muted">{getProviderName(m.provider, providerNodes)}</span>
                        </div>
                      </td>
                      <td className={TD_NUM}>{fmt(m.requests)}</td>
                      <td className={TD_NUM}>{fmt(m.promptTokens)}</td>
                      <td className={TD_NUM}>{dash(m.cachedTokens)}</td>
                      <td className={TD_NUM}>{dash(m.cacheCreationTokens)}</td>
                      <td className={TD_NUM}>{fmt(m.completionTokens)}</td>
                      {showReasoning && <td className={TD_NUM}>{dash(m.reasoningTokens)}</td>}
                      <td className={TD_NUM}>{fmtCost(m.cost)}</td>
                      <td className={TD_NUM}>
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{fmtDuration(m.durationMs)}</span>
                          <span className="font-sans text-xs text-text-muted">avg {fmtDuration(m.avgLatencyMs)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-black/[0.03] dark:bg-white/[0.03] font-semibold">
                    <td className="px-3 py-4 text-sm text-text-main">Total</td>
                    <td className={TD_NUM}>{fmt(breakdown.totals.requests)}</td>
                    <td className={TD_NUM}>{fmt(breakdown.totals.promptTokens)}</td>
                    <td className={TD_NUM}>{dash(breakdown.totals.cachedTokens)}</td>
                    <td className={TD_NUM}>{dash(breakdown.totals.cacheCreationTokens)}</td>
                    <td className={TD_NUM}>{fmt(breakdown.totals.completionTokens)}</td>
                    {showReasoning && <td className={TD_NUM}>{dash(breakdown.totals.reasoningTokens)}</td>}
                    <td className={TD_NUM}>{fmtCost(breakdown.totals.cost)}</td>
                    <td className={TD_NUM}>
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{fmtDuration(breakdown.totals.durationMs)}</span>
                        <span className="font-sans text-xs font-normal text-text-muted">avg {fmtDuration(breakdown.totals.avgLatencyMs)}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-muted">
              Input includes cached tokens. Time Used is the sum of request latencies; requests can overlap when subagents run in parallel, so it may exceed the session duration.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
