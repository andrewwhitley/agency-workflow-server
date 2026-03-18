import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

interface Prospect {
  id: string;
  company_name: string;
  domain: string | null;
  city: string;
  state: string;
  specialty: string | null;
  website: string;
  enrichment_status: string;
  total_score: number | null;
  qualification_tier: string | null;
  pillar_scores: Record<string, number> | null;
  sales_angles: string[] | null;
  website_platform: string | null;
  organic_traffic: number | null;
  organic_keywords: number | null;
  domain_rank: number | null;
  has_fb_pixel: boolean;
  has_google_pixel: boolean;
  has_chatbot: boolean;
  chatbot_provider: string | null;
  crm_platform: string | null;
  has_booking_widget: boolean;
  booking_provider: string | null;
  has_lead_capture: boolean;
  gbp_rating: number | null;
  gbp_review_count: number | null;
  provider_count: number | null;
  employee_count: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_linkedin: string;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  skipped: number;
  tierDistribution: Record<string, number>;
  avgScore: number;
  topStates: { state: string; count: number }[];
}

interface EnrichmentRun {
  id: string;
  status: string;
  total_prospects: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  estimated_cost: number;
  actual_cost: number;
  dry_run: boolean;
  started_at: string;
  completed_at: string | null;
}

// ── Tier badge colors ─────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  dream: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  maybe: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  unqualified: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-zinc-400",
  in_progress: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-amber-400",
};

// ── Component ─────────────────────────────────────────────────

export function EnrichmentPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [runs, setRuns] = useState<EnrichmentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Import
  const [sheetId, setSheetId] = useState("");
  const [sheetTab, setSheetTab] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  // Enrichment controls
  const [enriching, setEnriching] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState<string>("");
  const [enrichProgress, setEnrichProgress] = useState<any>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [concurrency, setConcurrency] = useState(2);
  const [maxProspects, setMaxProspects] = useState(0);
  const [dryRun, setDryRun] = useState(false);
  const [costCap, setCostCap] = useState(50);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Export
  const [exportSheetId, setExportSheetId] = useState("");
  const [exportTier, setExportTier] = useState("dream");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState("");

  // ── Load data ───────────────────────────────────────────────

  const loadStats = useCallback(() => {
    api<Stats>("/sales/stats").then(setStats).catch(console.error);
  }, []);

  const loadProspects = useCallback(() => {
    const params = new URLSearchParams();
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));

    api<{ prospects: Prospect[]; total: number }>(`/sales/prospects?${params}`)
      .then((data) => {
        setProspects(data.prospects);
        setTotal(data.total);
      })
      .catch(console.error);
  }, [tier, status, search, page]);

  const loadRuns = useCallback(() => {
    api<EnrichmentRun[]>("/sales/enrich/runs").then(setRuns).catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([loadStats(), loadProspects(), loadRuns()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProspects(); }, [tier, status, search, page]);

  // ── SSE Progress ────────────────────────────────────────────

  const startSSE = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource("/api/sales/enrich/status");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEnrichProgress(data);
        setEnrichStatus(data.status);
        if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
          setEnriching(false);
          es.close();
          eventSourceRef.current = null;
          loadStats();
          loadProspects();
          loadRuns();
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
    eventSourceRef.current = es;
  }, [loadStats, loadProspects, loadRuns]);

  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  // ── Handlers ────────────────────────────────────────────────

  const handleImport = async () => {
    if (!sheetId) return;
    setImporting(true);
    setImportResult("");
    try {
      const result = await api<{ imported: number; skipped: number; total: number }>("/sales/import", {
        method: "POST",
        body: JSON.stringify({ sheetId, tab: sheetTab || undefined }),
      });
      setImportResult(`Imported ${result.imported} of ${result.total} rows (${result.skipped} skipped)`);
      loadStats();
      loadProspects();
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleStartEnrichment = async () => {
    setEnriching(true);
    setEnrichProgress(null);
    try {
      await api("/sales/enrich/start", {
        method: "POST",
        body: JSON.stringify({
          batchSize,
          concurrency,
          max: maxProspects || undefined,
          dryRun,
          costCap,
        }),
      });
      setEnrichStatus("running");
      startSSE();
    } catch (err: any) {
      setEnriching(false);
      setEnrichStatus(`Error: ${err.message}`);
    }
  };

  const handlePause = () => api("/sales/enrich/pause", { method: "POST" }).catch(console.error);
  const handleResume = () => api("/sales/enrich/resume", { method: "POST" }).then(() => startSSE()).catch(console.error);
  const handleCancel = () => api("/sales/enrich/cancel", { method: "POST" }).catch(console.error);

  const handleExport = async () => {
    if (!exportSheetId) return;
    setExporting(true);
    setExportResult("");
    try {
      const result = await api<{ exported: number }>("/sales/export", {
        method: "POST",
        body: JSON.stringify({ sheetId: exportSheetId, tier: exportTier || undefined }),
      });
      setExportResult(`Exported ${result.exported} prospects`);
    } catch (err: any) {
      setExportResult(`Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse text-muted">Loading enrichment data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prospect Enrichment</h1>
        <p className="text-sm text-muted mt-1">Import, enrich, and score prospects for sales outreach</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} className="text-zinc-400" />
          <StatCard label="Completed" value={stats.completed} className="text-emerald-400" />
          <StatCard label="Failed" value={stats.failed} className="text-red-400" />
          <StatCard label="Avg Score" value={stats.avgScore} />
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-dim">Tiers</div>
            <div className="mt-1 space-y-0.5">
              {["dream", "good", "maybe", "unqualified"].map((t) => (
                <div key={t} className="flex justify-between text-xs">
                  <span className="capitalize text-muted">{t}</span>
                  <span className="text-foreground font-medium">{stats.tierDistribution[t] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Panel */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Import from Coldlytics Sheet</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="text-xs text-dim block mb-1">Google Sheet ID or URL</label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="Sheet ID or full URL"
              className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-dim block mb-1">Tab name (optional)</label>
            <input
              type="text"
              value={sheetTab}
              onChange={(e) => setSheetTab(e.target.value)}
              placeholder="Sheet1"
              className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <button
            onClick={handleImport}
            disabled={importing || !sheetId}
            className="px-4 py-1.5 bg-accent text-white text-sm rounded font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
        {importResult && (
          <div className={`mt-2 text-sm ${importResult.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
            {importResult}
          </div>
        )}
      </div>

      {/* Enrichment Controls */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Enrichment Pipeline</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-dim block mb-1">Batch Size</label>
            <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-20 bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-dim block mb-1">Concurrency</label>
            <input type="number" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-20 bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-dim block mb-1">Max (0=all)</label>
            <input type="number" value={maxProspects} onChange={(e) => setMaxProspects(Number(e.target.value))}
              className="w-20 bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-dim block mb-1">Cost Cap ($)</label>
            <input type="number" value={costCap} onChange={(e) => setCostCap(Number(e.target.value))}
              className="w-20 bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)}
              className="rounded" />
            Dry Run (5 max)
          </label>
          <div className="flex gap-2">
            {!enriching ? (
              <button onClick={handleStartEnrichment}
                className="px-4 py-1.5 bg-accent text-white text-sm rounded font-medium hover:bg-accent/90">
                Start Enrichment
              </button>
            ) : (
              <>
                <button onClick={handlePause}
                  className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded font-medium hover:bg-amber-500">
                  Pause
                </button>
                <button onClick={handleResume}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded font-medium hover:bg-blue-500">
                  Resume
                </button>
                <button onClick={handleCancel}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded font-medium hover:bg-red-500">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        {enrichProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>
                {enrichProgress.processed}/{enrichProgress.total} processed
                ({enrichProgress.succeeded} OK, {enrichProgress.failed} failed, {enrichProgress.skipped} skipped)
              </span>
              <span>${enrichProgress.cost?.toFixed(2)} spent</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${enrichProgress.total > 0 ? (enrichProgress.processed / enrichProgress.total) * 100 : 0}%` }}
              />
            </div>
            {enrichProgress.currentProspect && (
              <div className="text-xs text-dim mt-1">Current: {enrichProgress.currentProspect}</div>
            )}
            {enrichStatus && enrichStatus !== "running" && (
              <div className="text-xs mt-1 text-amber-400">Status: {enrichStatus}</div>
            )}
          </div>
        )}

        {/* Recent Runs */}
        {runs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Recent Runs</h3>
            <div className="space-y-1">
              {runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex gap-4 text-xs text-muted">
                  <span className={run.status === "completed" ? "text-emerald-400" : run.status === "failed" ? "text-red-400" : "text-amber-400"}>
                    {run.status}
                  </span>
                  <span>{run.processed}/{run.total_prospects}</span>
                  <span>${run.actual_cost.toFixed(2)}</span>
                  <span>{run.dry_run ? "(dry run)" : ""}</span>
                  <span className="text-dim">{new Date(run.started_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-surface border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Prospects ({total})
            </h2>
            <div className="flex gap-2 items-center flex-wrap">
              <select value={tier} onChange={(e) => { setTier(e.target.value); setPage(0); }}
                className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-foreground">
                <option value="">All Tiers</option>
                <option value="dream">Dream</option>
                <option value="good">Good</option>
                <option value="maybe">Maybe</option>
                <option value="unqualified">Unqualified</option>
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-foreground">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search..."
                className="bg-surface-2 border border-border rounded px-2 py-1 text-xs text-foreground w-40"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-dim border-b border-border">
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Tier</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="px-3 py-2 font-medium">Traffic</th>
                <th className="px-3 py-2 font-medium">Ads</th>
                <th className="px-3 py-2 font-medium">Chatbot</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => (
                <>
                  <tr
                    key={p.id}
                    className="border-b border-border/50 hover:bg-surface-2 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{p.company_name}</div>
                      {p.domain && <div className="text-dim">{p.domain}</div>}
                    </td>
                    <td className="px-3 py-2 text-muted">{p.city}{p.state ? `, ${p.state}` : ""}</td>
                    <td className={`px-3 py-2 ${STATUS_COLORS[p.enrichment_status] || "text-muted"}`}>
                      {p.enrichment_status}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{p.total_score ?? "—"}</td>
                    <td className="px-3 py-2">
                      {p.qualification_tier && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TIER_COLORS[p.qualification_tier] || ""}`}>
                          {p.qualification_tier}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">{p.website_platform || "—"}</td>
                    <td className="px-3 py-2 text-muted">{p.organic_traffic != null ? p.organic_traffic.toLocaleString() : "—"}</td>
                    <td className="px-3 py-2">
                      {p.enrichment_status === "completed" ? (
                        <span className={!p.has_fb_pixel && !p.has_google_pixel ? "text-emerald-400" : "text-zinc-400"}>
                          {!p.has_fb_pixel && !p.has_google_pixel ? "None" : [p.has_fb_pixel && "FB", p.has_google_pixel && "G"].filter(Boolean).join("+")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {p.enrichment_status === "completed" ? (
                        <span className={p.has_chatbot ? "text-zinc-400" : "text-emerald-400"}>
                          {p.has_chatbot ? p.chatbot_provider || "Yes" : "None"}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr key={`${p.id}-detail`} className="bg-surface-2/50">
                      <td colSpan={9} className="px-4 py-3">
                        <ProspectDetail prospect={p} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {prospects.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted">
                    No prospects found. Import from a Coldlytics sheet to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-dim">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs bg-surface-2 rounded border border-border text-muted hover:text-foreground disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="px-3 py-1 text-xs bg-surface-2 rounded border border-border text-muted hover:text-foreground disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Panel */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Export to Dream List Sheet</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="text-xs text-dim block mb-1">Target Google Sheet ID or URL</label>
            <input
              type="text"
              value={exportSheetId}
              onChange={(e) => setExportSheetId(e.target.value)}
              placeholder="Sheet ID or URL for Dream List"
              className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-dim block mb-1">Tier Filter</label>
            <select value={exportTier} onChange={(e) => setExportTier(e.target.value)}
              className="bg-surface-2 border border-border rounded px-2 py-1.5 text-sm text-foreground">
              <option value="">All</option>
              <option value="dream">Dream</option>
              <option value="good">Good</option>
              <option value="maybe">Maybe</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || !exportSheetId}
            className="px-4 py-1.5 bg-accent text-white text-sm rounded font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
        {exportResult && (
          <div className={`mt-2 text-sm ${exportResult.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
            {exportResult}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-Components ────────────────────────────────────────────

function StatCard({ label, value, className = "" }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-dim">{label}</div>
      <div className={`text-xl font-bold mt-1 ${className || "text-foreground"}`}>{value}</div>
    </div>
  );
}

function ProspectDetail({ prospect: p }: { prospect: Prospect }) {
  const pillarScores = typeof p.pillar_scores === "string" ? JSON.parse(p.pillar_scores as any) : (p.pillar_scores || {});
  const salesAngles = typeof p.sales_angles === "string" ? JSON.parse(p.sales_angles as any) : (p.sales_angles || []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Pillar Scores */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-dim font-semibold mb-2">Pillar Scores</h4>
        <div className="space-y-1.5">
          {[
            { label: "Size", score: pillarScores.size, max: 25 },
            { label: "Website", score: pillarScores.website, max: 20 },
            { label: "SEO", score: pillarScores.seo, max: 25 },
            { label: "Ads", score: pillarScores.ads, max: 10 },
            { label: "AI/Automation", score: pillarScores.ai_automation, max: 20 },
          ].map(({ label, score, max }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted">{label}</span>
                <span className="text-foreground">{score ?? 0}/{max}</span>
              </div>
              <div className="w-full bg-surface rounded-full h-1.5">
                <div
                  className="bg-accent h-1.5 rounded-full"
                  style={{ width: `${max > 0 ? ((score || 0) / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-dim font-semibold mb-2">Details</h4>
        <div className="space-y-1 text-xs">
          <Detail label="Website" value={p.website} />
          <Detail label="Platform" value={p.website_platform} />
          <Detail label="Organic Traffic" value={p.organic_traffic?.toLocaleString()} />
          <Detail label="Keywords" value={p.organic_keywords?.toLocaleString()} />
          <Detail label="Domain Rank" value={p.domain_rank?.toString()} />
          <Detail label="Providers" value={p.provider_count?.toString()} />
          <Detail label="Employees" value={p.employee_count} />
          <Detail label="CRM" value={p.crm_platform} />
          <Detail label="Booking" value={p.booking_provider} />
          <Detail label="GBP Rating" value={p.gbp_rating ? `${p.gbp_rating} (${p.gbp_review_count} reviews)` : null} />
        </div>
      </div>

      {/* Sales Angles + Contact */}
      <div>
        {salesAngles.length > 0 && (
          <div className="mb-3">
            <h4 className="text-[10px] uppercase tracking-wider text-dim font-semibold mb-2">Sales Angles</h4>
            <ul className="space-y-1">
              {salesAngles.map((angle: string, i: number) => (
                <li key={i} className="text-xs text-muted flex gap-1.5">
                  <span className="text-accent shrink-0">*</span>
                  {angle}
                </li>
              ))}
            </ul>
          </div>
        )}
        <h4 className="text-[10px] uppercase tracking-wider text-dim font-semibold mb-2">Contact</h4>
        <div className="space-y-1 text-xs">
          <Detail label="Name" value={p.contact_name} />
          <Detail label="Email" value={p.contact_email} />
          <Detail label="Phone" value={p.contact_phone} />
          {p.contact_linkedin && (
            <div className="flex gap-2">
              <span className="text-dim w-16 shrink-0">LinkedIn</span>
              <a href={p.contact_linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">
                {p.contact_linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/(in\/)?/, "")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-dim w-16 shrink-0">{label}</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}
