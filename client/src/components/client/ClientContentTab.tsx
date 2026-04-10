/**
 * Full Content Manager — embedded in client portfolio.
 * All 7 tabs from the top-level ContentPage, adapted to receive clientSlug as a prop.
 */
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────

interface PlanPage { title: string; slug: string; type: string; status?: string; name?: string; path?: string; metaTitle?: string; }
interface CalendarItem {
  title?: string; name?: string; type?: string; targetMonth?: string;
  primaryKeyword?: string; secondaryKeywords?: string[];
  parentServicePage?: string;
  seoMetrics?: { primaryKeywordVolume?: number; primaryKeywordDifficulty?: number; primaryKeywordCpc?: number; primaryKeywordCompetition?: string; secondaryKeywordVolumes?: Record<string, number>; enrichedAt?: string; };
}
interface CalendarStrategy { calendar: CalendarItem[]; summary?: { totalPages?: number; blogPosts?: number; caseStudies?: number; }; }
interface PlanningRow { id: string; row_index: number; data: Record<string, string>; }
interface KeywordResult { keyword: string; searchVolume?: number; keywordDifficulty?: number; cpc?: number; competitionLevel?: string; }

interface ContentStatus { hasContentProfile?: boolean; hasProfile?: boolean; hasFulfillmentFolder?: boolean; hasPlanningSheet?: boolean; hasOutputFolder?: boolean; }

const TABS = ["plan", "calendar", "generate", "sheet", "runs", "settings"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<string, string> = { plan: "Content Plan", calendar: "Calendar", generate: "Generate", sheet: "Planning Sheet", runs: "Runs", settings: "Settings" };
const SHEET_SUBTABS = ["content-tracking", "topical-sitemap", "deliverables", "completed"] as const;

// ── Helpers ──────────────────────────────────

function volClass(vol?: number) { if (vol == null) return "text-muted"; if (vol > 100) return "text-success font-semibold"; if (vol > 10) return "text-warning font-semibold"; return "text-muted"; }
function diffClass(diff?: number) { if (diff == null) return "text-muted"; if (diff < 30) return "text-success font-semibold"; if (diff < 60) return "text-warning font-semibold"; return "text-destructive font-semibold"; }

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (<div className="bg-surface border border-border rounded-md p-4 flex-1 min-w-[120px]"><div className="text-2xl font-semibold text-foreground">{value}</div><div className="text-xs text-muted">{label}</div></div>);
}

function TypeBadge({ type }: { type?: string }) {
  const t = type || "other";
  const colors: Record<string, string> = { core: "bg-accent/10 text-accent", service: "bg-success/10 text-success", area: "bg-warning/10 text-warning", blog: "bg-accent/10 text-accent", support: "bg-surface-2 text-dim" };
  return <span className={cn("text-xs px-2 py-0.5 rounded font-medium", colors[t] || "bg-surface-2 text-dim")}>{t}</span>;
}

// ── Main Component ──────────────────────────────────

export function ClientContentTab({ clientSlug }: { clientSlug: string }) {
  const [tab, setTab] = useState<Tab>("plan");
  const [status, setStatus] = useState<ContentStatus | null>(null);

  useEffect(() => {
    // Try both status endpoint and client config endpoint
    api<ContentStatus>(`/content-management/clients/${clientSlug}/status`)
      .catch(() => api<ContentStatus>(`/content-management/clients/${clientSlug}`))
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, [clientSlug]);

  const hasProfile = status?.hasContentProfile ?? status?.hasProfile ?? false;

  return (
    <div>
      {/* Status badges */}
      {status && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: "Content Profile", ok: hasProfile },
            { label: "Fulfillment Folder", ok: !!status.hasFulfillmentFolder },
            { label: "Planning Sheet", ok: !!status.hasPlanningSheet },
            { label: "Output Folder", ok: !!status.hasOutputFolder },
          ].map((b) => (
            <span key={b.label} className={cn("text-xs px-2 py-1 rounded font-medium",
              b.ok ? "bg-success/10 text-success" : "bg-surface-2 text-dim"
            )}>{b.ok ? "✓" : "✗"} {b.label}</span>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground")}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "plan" && <PlanTab slug={clientSlug} />}
      {tab === "calendar" && <CalendarTab slug={clientSlug} />}
      {tab === "generate" && <GenerateTab slug={clientSlug} />}
      {tab === "sheet" && <SheetTab slug={clientSlug} />}

      {tab === "runs" && <RunsTab slug={clientSlug} />}
      {tab === "settings" && <SettingsTab slug={clientSlug} />}
    </div>
  );
}

// ── Plan Tab ───────────────────────────────────

function PlanTab({ slug }: { slug: string }) {
  const [pages, setPages] = useState<PlanPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<{ pages?: PlanPage[]; sitemap?: PlanPage[] }>(`/content-management/clients/${slug}/plan`)
      .then((d) => setPages(d.pages || d.sitemap || []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-muted text-sm">Loading content plan...</div>;

  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="text-left px-4 py-3 font-medium text-dim">Title</th>
            <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
            <th className="text-left px-4 py-3 font-medium text-dim">Path</th>
            <th className="text-left px-4 py-3 font-medium text-dim">Meta Title</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-4 py-3 text-foreground font-medium">{p.title || p.name}</td>
              <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
              <td className="px-4 py-3 text-muted font-mono text-xs">{p.path || p.slug}</td>
              <td className="px-4 py-3 text-muted text-xs">{p.metaTitle || p.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length === 0 && <div className="p-8 text-center text-muted">No content plan available. Ensure the client has a content profile configured in Settings.</div>}
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────

function CalendarTab({ slug }: { slug: string }) {
  const [strategy, setStrategy] = useState<CalendarStrategy | null>(null);
  const [generating, setGenerating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [seed, setSeed] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<KeywordResult[]>([]);

  const generate = async () => {
    setGenerating(true);
    try { setStrategy(await api<CalendarStrategy>(`/content-management/clients/${slug}/strategy`, { method: "POST" })); }
    catch (err) { console.error(err); }
    setGenerating(false);
  };

  const enrichWithSeo = async () => {
    if (!strategy?.calendar?.length) return;
    setEnriching(true);
    try {
      const kws = new Set<string>();
      for (const item of strategy.calendar) {
        if (item.primaryKeyword) kws.add(item.primaryKeyword.toLowerCase());
        item.secondaryKeywords?.forEach((sk) => kws.add(sk.toLowerCase()));
      }
      const result = await api<{ keywords: KeywordResult[] }>("/content-management/keywords/enrich", { method: "POST", body: JSON.stringify({ keywords: Array.from(kws) }) });
      const map: Record<string, KeywordResult> = {};
      (result.keywords || []).forEach((m) => (map[m.keyword.toLowerCase()] = m));
      const now = new Date().toISOString();
      setStrategy({
        ...strategy,
        calendar: strategy.calendar.map((item) => {
          const pk = (item.primaryKeyword || "").toLowerCase();
          const pkData = map[pk];
          const secondaryVols: Record<string, number> = {};
          item.secondaryKeywords?.forEach((sk) => { const d = map[sk.toLowerCase()]; if (d?.searchVolume) secondaryVols[sk] = d.searchVolume; });
          return { ...item, seoMetrics: { primaryKeywordVolume: pkData?.searchVolume, primaryKeywordDifficulty: pkData?.keywordDifficulty, primaryKeywordCpc: pkData?.cpc, primaryKeywordCompetition: pkData?.competitionLevel, secondaryKeywordVolumes: Object.keys(secondaryVols).length ? secondaryVols : undefined, enrichedAt: now } };
        }),
      });
    } catch (err) { console.error(err); }
    setEnriching(false);
  };

  const runKeywordSuggestions = async () => {
    if (!seed.trim()) return;
    setSuggesting(true);
    try { setSuggestions((await api<{ keywords: KeywordResult[] }>("/content-management/keywords/suggest", { method: "POST", body: JSON.stringify({ seed: seed.trim(), limit: 50 }) })).keywords || []); }
    catch (err) { console.error(err); }
    setSuggesting(false);
  };

  const hasMetrics = strategy?.calendar?.some((item) => item.seoMetrics) ?? false;
  const monthGroups: Record<string, CalendarItem[]> = {};
  strategy?.calendar?.forEach((item) => { const m = item.targetMonth || "Unscheduled"; if (!monthGroups[m]) monthGroups[m] = []; monthGroups[m].push(item); });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={generate} disabled={generating} className={cn("px-4 py-2 rounded-md text-sm font-medium", generating ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {generating ? "Generating..." : "Generate 12-Month Calendar"}
        </button>
        {strategy?.calendar?.length ? (
          <button onClick={enrichWithSeo} disabled={enriching} className={cn("px-4 py-2 rounded-md text-sm font-medium", enriching ? "bg-surface-2 text-dim" : "bg-surface-2 text-foreground hover:bg-surface-3")}>
            {enriching ? "Enriching..." : "Enrich with SEO Data"}
          </button>
        ) : null}
      </div>
      {strategy?.summary && (<div className="flex gap-4 flex-wrap mb-6"><StatCard value={strategy.summary.totalPages || 0} label="Total Pages" /><StatCard value={strategy.summary.blogPosts || 0} label="Blog Posts" /><StatCard value={strategy.summary.caseStudies || 0} label="Case Studies" /></div>)}
      {strategy?.calendar?.length ? (
        <div className="space-y-6">
          {Object.entries(monthGroups).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-foreground mb-2">{month}</h3>
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-surface-2">
                    <th className="text-left px-3 py-2 font-medium text-dim">Title</th>
                    <th className="text-left px-3 py-2 font-medium text-dim">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-dim">Primary Keyword</th>
                    {hasMetrics && <><th className="text-left px-3 py-2 font-medium text-dim">Vol</th><th className="text-left px-3 py-2 font-medium text-dim">Diff</th><th className="text-left px-3 py-2 font-medium text-dim">CPC</th></>}
                    <th className="text-left px-3 py-2 font-medium text-dim">Parent Page</th>
                  </tr></thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                        <td className="px-3 py-2 font-medium text-foreground">{item.title || item.name}</td>
                        <td className="px-3 py-2"><TypeBadge type={item.type || "blog"} /></td>
                        <td className="px-3 py-2 text-xs text-foreground">{item.primaryKeyword || "—"}</td>
                        {hasMetrics && <><td className={cn("px-3 py-2 text-xs", volClass(item.seoMetrics?.primaryKeywordVolume))}>{item.seoMetrics?.primaryKeywordVolume != null ? item.seoMetrics.primaryKeywordVolume.toLocaleString() : "—"}</td><td className={cn("px-3 py-2 text-xs", diffClass(item.seoMetrics?.primaryKeywordDifficulty))}>{item.seoMetrics?.primaryKeywordDifficulty ?? "—"}</td><td className="px-3 py-2 text-xs text-muted">{item.seoMetrics?.primaryKeywordCpc != null ? `$${item.seoMetrics.primaryKeywordCpc.toFixed(2)}` : "—"}</td></>}
                        <td className="px-3 py-2 text-xs text-muted">{item.parentServicePage || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (!generating && <div className="text-muted text-sm">Click "Generate 12-Month Calendar" to create an AI-powered editorial calendar.</div>)}
      {/* Keyword Suggestions */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Keyword Suggestions</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runKeywordSuggestions()} placeholder="Enter a seed keyword (e.g. chiropractic care)" className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
          <button onClick={runKeywordSuggestions} disabled={suggesting} className={cn("px-4 py-2 rounded-md text-sm font-medium", suggesting ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{suggesting ? "Searching..." : "Get Suggestions"}</button>
        </div>
        {suggestions.length > 0 && (
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-2"><th className="text-left px-3 py-2 font-medium text-dim">Keyword</th><th className="text-left px-3 py-2 font-medium text-dim">Volume</th><th className="text-left px-3 py-2 font-medium text-dim">Difficulty</th><th className="text-left px-3 py-2 font-medium text-dim">CPC</th><th className="text-left px-3 py-2 font-medium text-dim">Competition</th></tr></thead>
              <tbody>{suggestions.map((kw, i) => (<tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50"><td className="px-3 py-2 font-medium text-foreground">{kw.keyword}</td><td className={cn("px-3 py-2 text-xs", volClass(kw.searchVolume))}>{(kw.searchVolume || 0).toLocaleString()}</td><td className={cn("px-3 py-2 text-xs", diffClass(kw.keywordDifficulty))}>{kw.keywordDifficulty ?? "—"}</td><td className="px-3 py-2 text-xs text-muted">${(kw.cpc || 0).toFixed(2)}</td><td className="px-3 py-2 text-xs text-muted">{kw.competitionLevel || "—"}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Generate Tab ───────────────────────────────

function GenerateTab({ slug }: { slug: string }) {
  const [pages, setPages] = useState<PlanPage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qaEnabled, setQaEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<{ pages?: PlanPage[]; sitemap?: PlanPage[] }>(`/content-management/clients/${slug}/plan`)
      .then((d) => setPages(d.pages || d.sitemap || []))
      .catch(() => setPages([]));
  }, [slug]);

  const toggleAll = () => { if (selected.size === pages.length) setSelected(new Set()); else setSelected(new Set(pages.map((p) => p.slug))); };
  const toggle = (s: string) => { const next = new Set(selected); if (next.has(s)) next.delete(s); else next.add(s); setSelected(next); };

  const generate = async () => {
    if (selected.size === 0) return;
    setGenerating(true); setStatus("Starting generation...");
    try { await api(`/content-management/clients/${slug}/generate`, { method: "POST", body: JSON.stringify({ pages: Array.from(selected), qaEnabled }) }); setStatus("Generation complete!"); }
    catch (err) { setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`); }
    setGenerating(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={generate} disabled={generating || selected.size === 0} className={cn("px-4 py-2 rounded-md text-sm font-medium", generating || selected.size === 0 ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{generating ? "Generating..." : `Generate ${selected.size} page(s)`}</button>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={qaEnabled} onChange={(e) => setQaEnabled(e.target.checked)} /> QA Review</label>
      </div>
      {status && <div className="text-sm text-muted mb-4">{status}</div>}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-surface-2"><th className="px-4 py-3 w-8"><input type="checkbox" checked={selected.size === pages.length && pages.length > 0} onChange={toggleAll} /></th><th className="text-left px-4 py-3 font-medium text-dim">Page</th><th className="text-left px-4 py-3 font-medium text-dim">Type</th></tr></thead>
          <tbody>{pages.map((p) => (<tr key={p.slug} className="border-b border-border last:border-0 hover:bg-surface-2/50"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} /></td><td className="px-4 py-3 text-foreground">{p.title}</td><td className="px-4 py-3"><TypeBadge type={p.type} /></td></tr>))}</tbody>
        </table>
        {pages.length === 0 && <div className="p-8 text-center text-muted">No pages available. Configure a content profile first.</div>}
      </div>
    </div>
  );
}

// ── Sheet Tab ──────────────────────────────────

interface BigFiveArticle { title: string; category: string; type: string; }
interface TayaQuestion { question: string; stage: string; }
interface ContentSuggestionsResponse {
  articles: BigFiveArticle[];
  questions: TayaQuestion[];
  hasGenerated: boolean;
  bigFiveTotal: number;
  tayaTotal: number;
}

function SheetTab({ slug }: { slug: string }) {
  const [subtab, setSubtab] = useState<string>("content-tracking");
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ total: number; sheetsProcessed: number; imported: Record<string, number> } | null>(null);

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ContentSuggestionsResponse | null>(null);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());
  const [addingSuggestions, setAddingSuggestions] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    api<{ headers: string[]; rows: PlanningRow[] }>(`/content-management/clients/${slug}/planning/${subtab}`)
      .then((d) => { setHeaders(d.headers || []); setRows(d.rows || []); })
      .catch(() => { setHeaders([]); setRows([]); })
      .finally(() => setLoading(false));
  }, [slug, subtab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const importSheet = async () => { setImporting(true); try { await api(`/content-management/clients/${slug}/planning/import`, { method: "POST" }); fetchData(); } catch (err) { console.error(err); } setImporting(false); };
  const syncBack = async () => { setSyncing(true); try { await api(`/content-management/clients/${slug}/planning/sync-back`, { method: "POST" }); } catch (err) { console.error(err); } setSyncing(false); };

  const uploadExcel = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/content-management/clients/${slug}/planning/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Upload failed" })); throw new Error(err.error); }
      const data = await res.json();
      setUploadResult(data);
      fetchData();
    } catch (err) { console.error(err); }
    setUploading(false);
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    setSelectedTitles(new Set());
    setAddResult(null);
    try {
      const data = await api<ContentSuggestionsResponse>(`/cm/clients/${slug}/content-suggestions`);
      setSuggestions(data);
      // Pre-select all articles by default
      setSelectedTitles(new Set(data.articles.map((a) => a.title)));
    } catch (err) { console.error(err); setSuggestions({ articles: [], questions: [], hasGenerated: false, bigFiveTotal: 0, tayaTotal: 0 }); }
    setLoadingSuggestions(false);
  };

  const toggleSuggestion = (title: string) => {
    const next = new Set(selectedTitles);
    if (next.has(title)) next.delete(title); else next.add(title);
    setSelectedTitles(next);
  };

  const addSelected = async () => {
    if (!suggestions || selectedTitles.size === 0) return;
    setAddingSuggestions(true);
    setAddResult(null);
    try {
      const payload = suggestions.articles
        .filter((a) => selectedTitles.has(a.title))
        .map((a) => ({ title: a.title, type: a.type, category: a.category }));
      const res = await api<{ added: number }>(`/cm/clients/${slug}/content-suggestions/add-to-tracking`, {
        method: "POST",
        body: JSON.stringify({ suggestions: payload }),
      });
      setAddResult(`✓ Added ${res.added} article${res.added === 1 ? "" : "s"} to Content Tracking sheet`);
      // Switch to content-tracking tab and refresh
      setSubtab("content-tracking");
      setTimeout(() => fetchData(), 300);
    } catch (err) {
      console.error(err);
      setAddResult("Failed to add suggestions");
    }
    setAddingSuggestions(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 flex-wrap">{SHEET_SUBTABS.map((st) => (<button key={st} onClick={() => setSubtab(st)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize", subtab === st ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>{st.replace(/-/g, " ")}</button>))}</div>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={loadSuggestions} className="px-3 py-1.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20">
              ✨ Suggest from Brand Strategy
            </button>
            <label className={cn("px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors", uploading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
              {uploading ? "Uploading..." : "Upload Excel"}
              <input type="file" accept=".xlsx,.xls" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadExcel(f); e.target.value = ""; }} />
            </label>
            <button onClick={importSheet} disabled={importing} className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-muted hover:bg-surface-3">{importing ? "Importing..." : "Import from Sheet"}</button>
            <button onClick={syncBack} disabled={syncing} className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-muted hover:bg-surface-3">{syncing ? "Syncing..." : "Sync Back"}</button>
          </div>
        </div>
        {uploadResult && (
          <div className="text-xs px-3 py-2 rounded bg-success/10 text-success border border-success/20">
            Imported {uploadResult.total} rows across {uploadResult.sheetsProcessed} sheets: {Object.entries(uploadResult.imported).map(([k, v]) => `${k} (${v})`).join(", ")}
          </div>
        )}
        {addResult && (
          <div className={cn("text-xs px-3 py-2 rounded border", addResult.startsWith("✓") ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
            {addResult}
          </div>
        )}
      </div>
      {loading ? (<div className="text-sm text-muted">Loading sheet data...</div>) : headers.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center">
          <div className="text-muted mb-2 text-sm font-medium">No planning data for this tab yet</div>
          <p className="text-xs text-dim mb-4">Upload your client's marketing info spreadsheet (.xlsx) using the "Upload Excel" button above. The system will automatically import sheets named Deliverables, Topical Sitemap, New Content Tracking, and Completed Articles.</p>
          <p className="text-xs text-dim">You can also link a Google Sheet in the Settings tab and use "Import from Sheet".</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface-2">{headers.map((h) => (<th key={h} className="text-left px-3 py-2 font-medium text-dim text-xs whitespace-nowrap">{h}</th>))}</tr></thead>
            <tbody>{rows.map((row) => (<tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">{headers.map((h) => (<td key={h} className="px-3 py-2 text-xs text-foreground whitespace-nowrap max-w-[200px] truncate">{row.data[h] || ""}</td>))}</tr>))}</tbody>
          </table>
          {rows.length === 0 && headers.length > 0 && <div className="p-8 text-center text-muted text-sm">Sheet structure imported but no data rows. Check the source spreadsheet.</div>}
        </div>
      )}

      {/* Brand Strategy Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSuggestions(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-4xl max-h-[85vh] flex flex-col p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Content Suggestions from Brand Strategy</h3>
                <p className="text-xs text-muted mt-1">
                  Generated from the client's brand story (Big 5 Content Topics + They Ask You Answer questions).
                  Select articles to add to the Content Tracking sheet.
                </p>
              </div>
              <button onClick={() => setShowSuggestions(false)} className="text-dim hover:text-foreground text-2xl leading-none">×</button>
            </div>

            {loadingSuggestions ? (
              <div className="text-sm text-muted py-12 text-center">Loading suggestions...</div>
            ) : !suggestions ? (
              <div className="text-sm text-muted py-12 text-center">No suggestions yet</div>
            ) : !suggestions.hasGenerated ? (
              <div className="bg-warning/10 border border-warning/20 rounded-md p-4 text-sm text-warning">
                ⚠️ This client doesn't have an Endless Customers brand story yet. Generate the brand story first
                (the new Big 5 / TAYA sections will be created automatically).
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Big 5 Articles */}
                <div>
                  <div className="flex items-center justify-between mb-3 sticky top-0 bg-surface py-2 z-10">
                    <h4 className="text-sm font-semibold text-foreground">📚 Big 5 Article Suggestions ({suggestions.articles.length})</h4>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedTitles(new Set(suggestions.articles.map((a) => a.title)))}
                        className="text-xs text-accent hover:underline">Select all</button>
                      <button onClick={() => setSelectedTitles(new Set())}
                        className="text-xs text-dim hover:underline">Clear</button>
                    </div>
                  </div>
                  {suggestions.articles.length === 0 ? (
                    <p className="text-xs text-muted">No Big 5 articles parsed from brand story.</p>
                  ) : (
                    <div className="space-y-1">
                      {/* Group by category */}
                      {Array.from(new Set(suggestions.articles.map((a) => a.category))).map((cat) => {
                        const items = suggestions.articles.filter((a) => a.category === cat);
                        return (
                          <div key={cat} className="mb-3">
                            <div className="text-xs font-semibold text-dim uppercase tracking-wider mb-1">{cat} ({items.length})</div>
                            <div className="space-y-0.5 pl-2">
                              {items.map((a, i) => (
                                <label key={`${cat}-${i}`} className="flex items-start gap-2 p-1.5 rounded hover:bg-surface-2 cursor-pointer">
                                  <input type="checkbox"
                                    checked={selectedTitles.has(a.title)}
                                    onChange={() => toggleSuggestion(a.title)}
                                    className="mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-foreground">{a.title}</div>
                                    <div className="text-xs text-dim mt-0.5">{a.type}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* TAYA Questions */}
                {suggestions.questions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">❓ They Ask, You Answer Questions ({suggestions.questions.length})</h4>
                    <p className="text-xs text-muted mb-2">These can become FAQ pages, blog posts, or training data for AI agents. Currently view-only.</p>
                    <div className="space-y-2 bg-surface-2 rounded p-3 max-h-64 overflow-y-auto">
                      {Array.from(new Set(suggestions.questions.map((q) => q.stage))).map((stage) => {
                        const items = suggestions.questions.filter((q) => q.stage === stage);
                        return (
                          <div key={stage}>
                            <div className="text-xs font-semibold text-dim uppercase tracking-wider mb-1">{stage} ({items.length})</div>
                            <ul className="text-xs text-foreground list-disc pl-5 space-y-0.5">
                              {items.map((q, i) => <li key={`${stage}-${i}`}>{q.question}</li>)}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {suggestions && suggestions.hasGenerated && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                <span className="text-sm text-muted">{selectedTitles.size} selected</span>
                <div className="flex gap-3">
                  <button onClick={() => setShowSuggestions(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
                  <button onClick={addSelected} disabled={addingSuggestions || selectedTitles.size === 0}
                    className={cn("px-4 py-2 rounded-md text-sm font-medium",
                      addingSuggestions || selectedTitles.size === 0 ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
                    {addingSuggestions ? "Adding..." : `Add ${selectedTitles.size} to Content Tracking`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// (SEO Research tab removed — now lives in the client SEO tab)

// ── Runs Tab ──────────────────────────────────

function RunsTab({ slug }: { slug: string }) {
  const [queue, setQueue] = useState<{ pending: number; running: number; completed: number }>({ pending: 0, running: 0, completed: 0 });
  useEffect(() => { api<typeof queue>("/content-management/queue").then(setQueue).catch(console.error); }, [slug]);
  return (<div><div className="grid grid-cols-3 gap-4"><StatCard value={queue.pending} label="Pending" /><StatCard value={queue.running} label="Running" /><StatCard value={queue.completed} label="Completed" /></div></div>);
}

// ── Settings Tab ──────────────────────────────

function SettingsTab({ slug }: { slug: string }) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Record<string, unknown>>(`/content-management/clients/${slug}`)
      .then((d) => setConfig({ fulfillmentFolderId: (d.fulfillmentFolderId as string) || "", planningSheetId: (d.planningSheetId as string) || "", outputFolder: (d.outputFolder as string) || "" }))
      .catch(() => {});
  }, [slug]);

  const save = async () => { setSaving(true); setSaved(false); try { await api(`/content-management/clients/${slug}/config`, { method: "PATCH", body: JSON.stringify(config) }); setSaved(true); } catch (err) { console.error(err); } setSaving(false); };

  return (
    <div className="max-w-xl space-y-4">
      <div><label className="block text-sm font-medium text-muted mb-1">Fulfillment Folder ID</label><input value={config.fulfillmentFolderId || ""} onChange={(e) => setConfig({ ...config, fulfillmentFolderId: e.target.value })} className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" /></div>
      <div><label className="block text-sm font-medium text-muted mb-1">Planning Sheet ID</label><input value={config.planningSheetId || ""} onChange={(e) => setConfig({ ...config, planningSheetId: e.target.value })} className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" /></div>
      <div><label className="block text-sm font-medium text-muted mb-1">Output Folder ID</label><input value={config.outputFolder || ""} onChange={(e) => setConfig({ ...config, outputFolder: e.target.value })} className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" /></div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className={cn("px-4 py-2 rounded-md text-sm font-medium", saving ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{saving ? "Saving..." : "Save Settings"}</button>
        {saved && <span className="text-sm text-success">Saved!</span>}
      </div>
    </div>
  );
}
