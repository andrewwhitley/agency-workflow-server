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
interface SerpItem { position?: number; title?: string; type?: string; url?: string; domain?: string; }
interface DomainKeyword { keyword: string; position: number; searchVolume?: number; cpc?: number; url?: string; }
interface DomainCompetitor { domain: string; avgPosition?: number; keywordIntersections?: number; organicTraffic?: number; }
interface ContentResult { title?: string; url?: string; datePublished?: string; contentLength?: number; }
interface BusinessListing { title?: string; rating?: number; reviewCount?: number; address?: string; phone?: string; category?: string; url?: string; }
interface ContentStatus { hasContentProfile?: boolean; hasProfile?: boolean; hasFulfillmentFolder?: boolean; hasPlanningSheet?: boolean; hasOutputFolder?: boolean; }

const TABS = ["plan", "calendar", "generate", "sheet", "seo", "runs", "settings"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<string, string> = { plan: "Content Plan", calendar: "Calendar", generate: "Generate", sheet: "Planning Sheet", seo: "SEO Research", runs: "Runs", settings: "Settings" };
const SHEET_SUBTABS = ["content-tracking", "topical-sitemap", "deliverables", "completed"] as const;
const SEO_SUBTABS = ["serp", "domain", "onpage", "content", "business"] as const;
const SEO_LABELS: Record<string, string> = { serp: "SERP Analysis", domain: "Domain Analytics", onpage: "On-Page Audit", content: "Content Analysis", business: "Business Listings" };

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
      {tab === "seo" && <SeoResearchTab />}
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

function SheetTab({ slug }: { slug: string }) {
  const [subtab, setSubtab] = useState<string>("content-tracking");
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">{SHEET_SUBTABS.map((st) => (<button key={st} onClick={() => setSubtab(st)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize", subtab === st ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>{st.replace(/-/g, " ")}</button>))}</div>
        <div className="flex gap-2">
          <button onClick={importSheet} disabled={importing} className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-muted hover:bg-surface-3">{importing ? "Importing..." : "Import from Sheet"}</button>
          <button onClick={syncBack} disabled={syncing} className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-muted hover:bg-surface-3">{syncing ? "Syncing..." : "Sync Back"}</button>
        </div>
      </div>
      {loading ? (<div className="text-sm text-muted">Loading sheet data...</div>) : (
        <div className="bg-surface border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface-2">{headers.map((h) => (<th key={h} className="text-left px-3 py-2 font-medium text-dim text-xs whitespace-nowrap">{h}</th>))}</tr></thead>
            <tbody>{rows.map((row) => (<tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">{headers.map((h) => (<td key={h} className="px-3 py-2 text-xs text-foreground whitespace-nowrap max-w-[200px] truncate">{row.data[h] || ""}</td>))}</tr>))}</tbody>
          </table>
          {rows.length === 0 && <div className="p-8 text-center text-muted text-sm">No data. Import from Google Sheet to get started.</div>}
        </div>
      )}
    </div>
  );
}

// ── SEO Research Tab ──────────────────────────

function SeoResearchTab() {
  const [subtab, setSubtab] = useState<string>("serp");
  return (
    <div>
      <div className="flex gap-1 mb-6">{SEO_SUBTABS.map((st) => (<button key={st} onClick={() => setSubtab(st)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", subtab === st ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>{SEO_LABELS[st]}</button>))}</div>
      {subtab === "serp" && <SerpPanel />}
      {subtab === "domain" && <DomainPanel />}
      {subtab === "onpage" && <OnPagePanel />}
      {subtab === "content" && <ContentAnalysisPanel />}
      {subtab === "business" && <BusinessPanel />}
    </div>
  );
}

function SerpPanel() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ totalResults?: number; items?: SerpItem[]; peopleAlsoAsk?: string[]; relatedSearches?: string[] } | null>(null);

  const search = async () => { if (!keyword.trim()) return; setLoading(true); try { setData(await api("/seo/serp", { method: "POST", body: JSON.stringify({ keyword: keyword.trim() }) })); } catch (err) { console.error(err); } setLoading(false); };
  const searchRelated = (term: string) => { setKeyword(term); setLoading(true); api<typeof data>("/seo/serp", { method: "POST", body: JSON.stringify({ keyword: term }) }).then(setData).catch(console.error).finally(() => setLoading(false)); };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Enter a search query..." className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        <button onClick={search} disabled={loading} className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{loading ? "Searching..." : "Search"}</button>
      </div>
      {data && (<div className="space-y-4">
        <div className="text-xs text-muted">{(data.totalResults || 0).toLocaleString()} results</div>
        {data.peopleAlsoAsk?.length ? (<div className="bg-surface-2 rounded-md p-3"><div className="text-sm font-semibold text-foreground mb-2">People Also Ask</div><ul className="text-sm text-muted space-y-1 ml-4 list-disc">{data.peopleAlsoAsk.map((q, i) => <li key={i}>{q}</li>)}</ul></div>) : null}
        <div className="bg-surface border border-border rounded-md overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-2"><th className="text-center px-3 py-2 font-medium text-dim w-12">#</th><th className="text-left px-3 py-2 font-medium text-dim">Title</th><th className="text-left px-3 py-2 font-medium text-dim">Type</th><th className="text-left px-3 py-2 font-medium text-dim">URL</th></tr></thead>
          <tbody>{(data.items || []).map((item, i) => (<tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50"><td className="px-3 py-2 text-center font-semibold text-dim">{item.position}</td><td className="px-3 py-2 font-medium text-foreground">{item.title}</td><td className="px-3 py-2"><TypeBadge type={item.type === "organic" ? "core" : item.type === "local_pack" ? "area" : "support"} /></td><td className="px-3 py-2 text-xs max-w-[300px] truncate">{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{item.domain || item.url}</a>}</td></tr>))}</tbody></table></div>
        {data.relatedSearches?.length ? (<div className="bg-surface-2 rounded-md p-3"><div className="text-sm font-semibold text-foreground mb-2">Related Searches</div><div className="flex flex-wrap gap-2">{data.relatedSearches.map((rs, i) => (<button key={i} onClick={() => searchRelated(rs)} className="px-2 py-1 rounded text-xs bg-surface border border-border text-foreground hover:border-accent transition-colors">{rs}</button>))}</div></div>) : null}
      </div>)}
    </div>
  );
}

function DomainPanel() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<{ organicTraffic?: number; organicKeywords?: number; rank?: number } | null>(null);
  const [keywords, setKeywords] = useState<DomainKeyword[]>([]);
  const [competitors, setCompetitors] = useState<DomainCompetitor[]>([]);

  const analyze = async (d?: string) => {
    const target = d || domain.trim(); if (!target) return; if (d) setDomain(d); setLoading(true);
    try {
      const [ov, kw, comp] = await Promise.all([
        api<typeof overview>("/seo/domain/overview", { method: "POST", body: JSON.stringify({ domain: target }) }),
        api<{ keywords?: DomainKeyword[] }>("/seo/domain/keywords", { method: "POST", body: JSON.stringify({ domain: target, limit: 20 }) }),
        api<{ competitors?: DomainCompetitor[] }>("/seo/domain/competitors", { method: "POST", body: JSON.stringify({ domain: target, limit: 10 }) }),
      ]);
      setOverview(ov); setKeywords(kw.keywords || []); setCompetitors(comp.competitors || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()} placeholder="Enter a domain (e.g. example.com)" className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        <button onClick={() => analyze()} disabled={loading} className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{loading ? "Analyzing..." : "Analyze"}</button>
      </div>
      {overview && (<div className="space-y-6">
        <div className="flex gap-4 flex-wrap"><StatCard value={(overview.organicTraffic || 0).toLocaleString()} label="Est. Monthly Traffic" /><StatCard value={(overview.organicKeywords || 0).toLocaleString()} label="Ranked Keywords" /><StatCard value={(overview.rank || 0).toLocaleString()} label="Domain Rank" /></div>
        {keywords.length > 0 && (<div><h3 className="text-sm font-semibold text-foreground mb-2">Top Ranked Keywords</h3><div className="bg-surface border border-border rounded-md overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-2"><th className="text-left px-3 py-2 font-medium text-dim">Keyword</th><th className="text-center px-3 py-2 font-medium text-dim">Pos</th><th className="text-left px-3 py-2 font-medium text-dim">Vol</th><th className="text-left px-3 py-2 font-medium text-dim">CPC</th><th className="text-left px-3 py-2 font-medium text-dim">URL</th></tr></thead>
          <tbody>{keywords.map((kw, i) => (<tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50"><td className="px-3 py-2 font-medium text-foreground">{kw.keyword}</td><td className="px-3 py-2 text-center font-semibold">{kw.position}</td><td className={cn("px-3 py-2 text-xs", volClass(kw.searchVolume))}>{(kw.searchVolume || 0).toLocaleString()}</td><td className="px-3 py-2 text-xs text-muted">${(kw.cpc || 0).toFixed(2)}</td><td className="px-3 py-2 text-xs max-w-[200px] truncate">{kw.url && <a href={kw.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{kw.url.replace(/^https?:\/\/[^/]+/, "")}</a>}</td></tr>))}</tbody></table></div></div>)}
        {competitors.length > 0 && (<div><h3 className="text-sm font-semibold text-foreground mb-2">Competitors</h3><div className="bg-surface border border-border rounded-md overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-2"><th className="text-left px-3 py-2 font-medium text-dim">Domain</th><th className="text-center px-3 py-2 font-medium text-dim">Avg Position</th><th className="text-left px-3 py-2 font-medium text-dim">Keyword Overlap</th><th className="text-left px-3 py-2 font-medium text-dim">Est. Traffic</th></tr></thead>
          <tbody>{competitors.map((c, i) => (<tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50"><td className="px-3 py-2"><button onClick={() => analyze(c.domain)} className="text-accent hover:underline font-medium">{c.domain}</button></td><td className="px-3 py-2 text-center">{(c.avgPosition || 0).toFixed(1)}</td><td className="px-3 py-2">{(c.keywordIntersections || 0).toLocaleString()}</td><td className="px-3 py-2">{c.organicTraffic ? c.organicTraffic.toLocaleString() : "—"}</td></tr>))}</tbody></table></div></div>)}
      </div>)}
    </div>
  );
}

function OnPagePanel() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ onpageScore?: number; statusCode?: number; loadTime?: number; size?: number; title?: string; description?: string; h1?: string[]; brokenLinks?: number; brokenResources?: number; duplicateTitle?: boolean; duplicateDescription?: boolean; checks?: Record<string, boolean>; } | null>(null);
  const audit = async () => { if (!url.trim()) return; setLoading(true); try { setData(await api("/seo/onpage", { method: "POST", body: JSON.stringify({ url: url.trim() }) })); } catch (err) { console.error(err); } setLoading(false); };
  const scoreColor = (score?: number) => { if (!score) return "text-muted"; if (score >= 80) return "text-success"; if (score >= 50) return "text-warning"; return "text-destructive"; };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && audit()} placeholder="Enter a full URL (e.g. https://example.com/)" className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        <button onClick={audit} disabled={loading} className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{loading ? "Auditing..." : "Audit"}</button>
      </div>
      {data && (<div className="space-y-6">
        <div className="flex gap-4 flex-wrap"><div className="bg-surface border border-border rounded-md p-4 flex-1 min-w-[120px]"><div className={cn("text-4xl font-bold", scoreColor(data.onpageScore))}>{(data.onpageScore || 0).toFixed(0)}</div><div className="text-xs text-muted">SEO Score</div></div><StatCard value={data.statusCode || 0} label="Status Code" /><StatCard value={`${((data.loadTime || 0) * 1000).toFixed(0)}ms`} label="Load Time" /><StatCard value={`${((data.size || 0) / 1024).toFixed(0)}KB`} label="Page Size" /></div>
        <div><h3 className="text-sm font-semibold text-foreground mb-2">Meta Tags</h3><div className="bg-surface-2 rounded-md p-4 text-sm space-y-2"><div><span className="font-semibold">Title:</span> {data.title || "Missing"}</div><div><span className="font-semibold">Description:</span> {data.description || "Missing"}</div><div><span className="font-semibold">H1:</span> {data.h1?.length ? data.h1.join(", ") : "Missing"}</div></div></div>
        {(data.brokenLinks || data.brokenResources || data.duplicateTitle || data.duplicateDescription) && (<div><h3 className="text-sm font-semibold text-destructive mb-2">Issues Found</h3><div className="flex flex-wrap gap-2">{!!data.brokenLinks && <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive">{data.brokenLinks} broken links</span>}{!!data.brokenResources && <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive">{data.brokenResources} broken resources</span>}{data.duplicateTitle && <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning">Duplicate title</span>}{data.duplicateDescription && <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning">Duplicate description</span>}</div></div>)}
        {data.checks && (<div><h3 className="text-sm font-semibold text-foreground mb-2">Technical Checks</h3><div className="flex flex-wrap gap-2">{Object.entries(data.checks).map(([key, val]) => { const isGood = (key === "is_https" || key === "has_meta_title" || key === "has_meta_description") ? val : !val; const label = key.replace(/_/g, " ").replace(/^is /, "").replace(/^has /, "").replace(/^no /, "missing "); return (<span key={key} className={cn("text-xs px-2 py-1 rounded", isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{isGood ? "✓" : "✗"} {label}</span>); })}</div></div>)}
      </div>)}
    </div>
  );
}

function ContentAnalysisPanel() {
  const [keyword, setKeyword] = useState(""); const [loading, setLoading] = useState(false); const [results, setResults] = useState<ContentResult[]>([]);
  const search = async () => { if (!keyword.trim()) return; setLoading(true); try { setResults((await api<{ results?: ContentResult[] }>("/seo/content", { method: "POST", body: JSON.stringify({ keyword: keyword.trim(), limit: 20 }) })).results || []); } catch (err) { console.error(err); } setLoading(false); };
  return (
    <div>
      <div className="flex gap-2 mb-4"><input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search for content about..." className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" /><button onClick={search} disabled={loading} className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{loading ? "Searching..." : "Search"}</button></div>
      {results.length > 0 && (<div className="bg-surface border border-border rounded-md overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-surface-2"><th className="text-left px-3 py-2 font-medium text-dim">Title</th><th className="text-left px-3 py-2 font-medium text-dim">URL</th><th className="text-left px-3 py-2 font-medium text-dim">Published</th><th className="text-left px-3 py-2 font-medium text-dim">Length</th></tr></thead>
        <tbody>{results.map((item, i) => (<tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50"><td className="px-3 py-2 font-medium text-foreground max-w-[300px] truncate">{item.title}</td><td className="px-3 py-2 text-xs max-w-[250px] truncate">{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{item.url.replace(/^https?:\/\//, "").slice(0, 60)}</a>}</td><td className="px-3 py-2 text-xs text-muted">{item.datePublished ? new Date(item.datePublished).toLocaleDateString() : "—"}</td><td className="px-3 py-2 text-xs text-muted">{item.contentLength ? (item.contentLength > 1000 ? `${(item.contentLength / 1000).toFixed(1)}K` : item.contentLength) + " chars" : "—"}</td></tr>))}</tbody></table></div>)}
    </div>
  );
}

function BusinessPanel() {
  const [keyword, setKeyword] = useState(""); const [loading, setLoading] = useState(false); const [listings, setListings] = useState<BusinessListing[]>([]);
  const search = async () => { if (!keyword.trim()) return; setLoading(true); try { setListings((await api<{ listings?: BusinessListing[] }>("/seo/business", { method: "POST", body: JSON.stringify({ keyword: keyword.trim(), limit: 20 }) })).listings || []); } catch (err) { console.error(err); } setLoading(false); };
  return (
    <div>
      <div className="flex gap-2 mb-4"><input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search businesses (e.g. chiropractor phoenix az)" className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" /><button onClick={search} disabled={loading} className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>{loading ? "Searching..." : "Search"}</button></div>
      {listings.length > 0 && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{listings.map((biz, i) => (<div key={i} className="bg-surface border border-border rounded-md p-4"><div className="font-semibold text-sm text-foreground mb-1">{biz.title}</div>{biz.rating != null && (<div className="flex items-center gap-1 mb-2">{[1,2,3,4,5].map((s)=>(<span key={s} className={s<=Math.round(biz.rating!)?"text-warning":"text-dim"}>&#9733;</span>))}<span className="text-xs text-muted ml-1">{biz.rating.toFixed(1)} ({biz.reviewCount||0})</span></div>)}{biz.address && <div className="text-xs text-muted mb-1">{biz.address}</div>}{biz.phone && <div className="text-xs text-muted mb-1">{biz.phone}</div>}{biz.category && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">{biz.category}</span>}{biz.url && <div className="mt-2"><a href={biz.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Website</a></div>}</div>))}</div>)}
    </div>
  );
}

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
