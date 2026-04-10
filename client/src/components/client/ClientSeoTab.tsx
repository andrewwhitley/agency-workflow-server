/**
 * Full SEO tab for client portfolio — all SEO tools in one place.
 * Sub-tabs: Overview, Keywords, Heatmap, Audits, Research
 */
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────

interface DomainSnapshot {
  organic_traffic: number; organic_keywords: number; rank: number;
  backlinks: number; referring_domains: number; snapshot_date: string;
}
interface TrackedKeyword {
  id: string; keyword: string; current_position: number | null;
  previous_position: number | null; search_volume: number | null;
  ranking_url: string | null; last_checked: string | null;
  track_local_pack?: boolean; source?: string; location_code?: number;
}
interface KeywordSuggestion {
  keyword: string; searchVolume: number; difficulty: number | null;
  cpc: number; competition: string | null; alreadyTracked: boolean;
}
interface HeatmapScan {
  id: string; keyword: string; center_lat: number; center_lng: number;
  grid_size: number; radius_miles: number; business_name: string | null;
  scanned_at: string; point_count?: number; found_count?: number; top3_count?: number;
}
interface HeatmapPoint {
  grid_row: number; grid_col: number; latitude: number; longitude: number;
  position: number | null; top_competitor?: string | null;
}
interface AuditResult {
  url: string; statusCode?: number; status_code?: number;
  onpageScore?: number; onpage_score?: number; title?: string;
  description?: string; h1?: string[]; loadTime?: number; load_time?: number;
  brokenLinks?: number; broken_links?: number; size?: number;
  duplicateTitle?: boolean; duplicate_title?: boolean;
  duplicateDescription?: boolean; duplicate_description?: boolean;
  checks?: Record<string, boolean>;
  audited_at?: string;
}

const SEO_TABS = ["overview", "keywords", "heatmap", "audits", "research"] as const;
type SeoTab = typeof SEO_TABS[number];
const TAB_LABELS: Record<SeoTab, string> = { overview: "Overview", keywords: "Keywords", heatmap: "Local Heatmap", audits: "Audits", research: "Research" };

function positionDelta(curr: number | null, prev: number | null) {
  if (curr == null || prev == null) return null;
  return prev - curr;
}

function safeDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  } catch { return "—"; }
}

// ── Main Component ──────────────────────────────────

export function ClientSeoTab({ clientSlug, clientDomain }: { clientSlug: string; clientDomain: string }) {
  const [tab, setTab] = useState<SeoTab>("overview");

  if (!clientDomain) {
    return (
      <div className="bg-surface border border-border rounded-md p-8 text-center">
        <p className="text-sm text-muted mb-2">No domain configured for this client.</p>
        <p className="text-xs text-dim">Add a website URL in the Company Profile tab to enable SEO tracking, keyword monitoring, local heatmaps, and technical audits.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {SEO_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground")}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab slug={clientSlug} domain={clientDomain} />}
      {tab === "keywords" && <KeywordsTab slug={clientSlug} domain={clientDomain} />}
      {tab === "heatmap" && <HeatmapTab slug={clientSlug} />}
      {tab === "audits" && <AuditsTab slug={clientSlug} domain={clientDomain} />}
      {tab === "research" && <ResearchTab domain={clientDomain} />}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────

function OverviewTab({ slug, domain }: { slug: string; domain: string }) {
  const [snapshots, setSnapshots] = useState<DomainSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  useEffect(() => {
    api<DomainSnapshot[]>(`/seo/clients/${slug}/domain/history`).then(setSnapshots).catch(() => []).finally(() => setLoading(false));
  }, [slug]);

  const takeSnapshot = async () => {
    setSnapshotting(true);
    try {
      await api(`/seo/clients/${slug}/domain/snapshot`, { method: "POST" });
      setSnapshots(await api<DomainSnapshot[]>(`/seo/clients/${slug}/domain/history`));
    } catch (err) { console.error(err); }
    setSnapshotting(false);
  };

  if (loading) return <div className="text-sm text-muted">Loading overview...</div>;
  const latest = snapshots.find((s) => s.snapshot_date && !isNaN(new Date(s.snapshot_date).getTime()));

  return (
    <div>
      <p className="text-xs text-dim mb-4">Domain overview shows your client's overall organic search presence — traffic, keyword count, domain authority, and backlink profile. Take regular snapshots to track growth over time.</p>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium text-foreground">{domain}</span>
        <Button size="sm" onClick={takeSnapshot} disabled={snapshotting}>
          {snapshotting ? "Pulling data..." : "Take Snapshot"}
        </Button>
        {latest && <span className="text-xs text-dim">Last: {safeDate(latest.snapshot_date)}</span>}
      </div>
      {latest ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Est. Monthly Traffic", value: latest.organic_traffic?.toLocaleString(), help: "Estimated organic visitors/month" },
            { label: "Ranked Keywords", value: latest.organic_keywords?.toLocaleString(), help: "Keywords ranking in top 100" },
            { label: "Domain Rank", value: String(latest.rank || "—"), help: "Overall domain authority (0-100)" },
            { label: "Backlinks", value: latest.backlinks?.toLocaleString(), help: "Total inbound links from other sites" },
            { label: "Referring Domains", value: latest.referring_domains?.toLocaleString(), help: "Unique domains linking to this site" },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-md p-3" title={s.help}>
              <div className="text-[10px] text-dim uppercase tracking-wide">{s.label}</div>
              <div className="text-lg font-bold text-foreground">{s.value || "—"}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md p-6 text-center text-sm text-muted mb-6">
          No snapshots yet. Click "Take Snapshot" to pull current domain data from DataForSEO. This captures traffic, keyword count, domain rank, and backlink metrics.
        </div>
      )}
      {/* History */}
      {snapshots.filter((s) => s.snapshot_date && !isNaN(new Date(s.snapshot_date).getTime())).length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Snapshot History</h3>
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-surface-2">
                <th className="text-left px-3 py-2 text-dim text-xs">Date</th>
                <th className="text-right px-3 py-2 text-dim text-xs">Traffic</th>
                <th className="text-right px-3 py-2 text-dim text-xs">Keywords</th>
                <th className="text-right px-3 py-2 text-dim text-xs">Rank</th>
                <th className="text-right px-3 py-2 text-dim text-xs">Backlinks</th>
              </tr></thead>
              <tbody>
                {snapshots.filter((s) => s.snapshot_date && !isNaN(new Date(s.snapshot_date).getTime())).slice(0, 12).map((s, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{safeDate(s.snapshot_date)}</td>
                    <td className="px-3 py-2 text-right text-muted">{s.organic_traffic?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-2 text-right text-muted">{s.organic_keywords?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-2 text-right text-muted">{s.rank || "—"}</td>
                    <td className="px-3 py-2 text-right text-muted">{s.backlinks?.toLocaleString() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Keywords Tab ──────────────────────────────────

function KeywordsTab({ slug, domain }: { slug: string; domain: string }) {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKeywords, setNewKeywords] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[] | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);

  const fetchKeywords = useCallback(() => {
    setLoading(true);
    api<TrackedKeyword[]>(`/seo/clients/${slug}/keywords`).then(setKeywords).catch(() => []).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  const addKeywords = async () => {
    const kws = newKeywords.split("\n").map((k) => k.trim()).filter(Boolean);
    if (kws.length === 0) return;
    await api(`/seo/clients/${slug}/keywords`, {
      method: "POST",
      body: JSON.stringify({ keywords: kws, locationName: newLocation || undefined }),
    });
    setNewKeywords(""); setShowAdd(false); fetchKeywords();
  };

  const checkNow = async () => {
    setChecking(true);
    try { await api(`/seo/clients/${slug}/keywords/check`, { method: "POST" }); fetchKeywords(); }
    catch (err) { console.error(err); }
    setChecking(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this keyword?")) return;
    await api(`/seo/clients/${slug}/keywords/${id}`, { method: "DELETE" }); fetchKeywords();
  };

  const loadSuggestions = async () => {
    setSuggestLoading(true); setShowSuggest(true); setSelectedSuggestions(new Set());
    try {
      const data = await api<{ suggestions: KeywordSuggestion[] }>(`/seo/clients/${slug}/keywords/suggest-seeds`, { method: "POST", body: JSON.stringify({}) });
      setSuggestions(data.suggestions);
      setSelectedSuggestions(new Set(data.suggestions.filter((s) => !s.alreadyTracked && s.searchVolume > 10).map((s) => s.keyword)));
    } catch (err) { console.error(err); setSuggestions([]); }
    setSuggestLoading(false);
  };

  const bulkAddSelected = async () => {
    if (selectedSuggestions.size === 0) return;
    setBulkAdding(true);
    try {
      await api(`/seo/clients/${slug}/keywords/bulk-add`, { method: "POST", body: JSON.stringify({ keywords: Array.from(selectedSuggestions), source: "auto-suggested", trackLocalPack: true }) });
      setShowSuggest(false); setSuggestions(null); fetchKeywords();
    } catch (err) { console.error(err); }
    setBulkAdding(false);
  };

  return (
    <div>
      <p className="text-xs text-dim mb-4">
        Track your client's search rankings over time. Add keywords manually or auto-generate from their services and locations.
        Rankings are checked against Google's organic results — "Position" shows where the client's domain appears for that keyword.
        Use <strong>Check Rankings</strong> to update all positions, or schedule automatic weekly checks.
      </p>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button size="sm" onClick={loadSuggestions}>Suggest from Client Data</Button>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>Add Manually</Button>
        <Button size="sm" variant="outline" onClick={checkNow} disabled={checking || keywords.length === 0}>
          {checking ? "Checking..." : "Check Rankings"}
        </Button>
        <span className="text-xs text-dim ml-auto">{keywords.length} keywords tracked</span>
      </div>

      {loading ? <div className="text-sm text-muted">Loading...</div> : keywords.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center">
          <p className="text-sm text-muted mb-2">No keywords tracked yet.</p>
          <p className="text-xs text-dim">Click <strong>Suggest from Client Data</strong> to auto-generate keywords from the client's services and service areas (e.g., "functional medicine Hamden CT").</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-surface-2">
              <th className="text-left px-3 py-2 text-dim text-xs">Keyword</th>
              <th className="text-center px-3 py-2 text-dim text-xs" title="Google organic search position">Position</th>
              <th className="text-center px-3 py-2 text-dim text-xs" title="Position change since last check">Change</th>
              <th className="text-right px-3 py-2 text-dim text-xs" title="Monthly search volume">Volume</th>
              <th className="text-left px-3 py-2 text-dim text-xs">Last Checked</th>
              <th className="text-right px-3 py-2 text-dim text-xs"></th>
            </tr></thead>
            <tbody>
              {keywords.map((kw) => {
                const delta = positionDelta(kw.current_position, kw.previous_position);
                return (
                  <tr key={kw.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="px-3 py-2 text-foreground font-medium">{kw.keyword}</td>
                    <td className="px-3 py-2 text-center">
                      {kw.current_position ? (
                        <span className={cn("font-mono font-medium", kw.current_position <= 3 ? "text-success" : kw.current_position <= 10 ? "text-accent" : "text-muted")}>{kw.current_position}</span>
                      ) : <span className="text-dim" title="Not ranking in top 30">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {delta != null ? <span className={cn("text-xs font-medium", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-dim")}>{delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}</span> : <span className="text-dim">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-muted">{kw.search_volume?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-2 text-xs text-dim">{safeDate(kw.last_checked)}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => remove(kw.id)} className="text-xs text-destructive hover:underline">Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add keywords modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-3">Add Keywords</h3>
            <p className="text-xs text-muted mb-3">One keyword per line. Include the city/location in the keyword for local results (e.g., "functional medicine Hamden CT").</p>
            <textarea value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} rows={6} placeholder={"functional medicine hamden ct\nnaturopathic doctor near me\nacupuncture new haven"} className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono" />
            <div className="mt-3">
              <label className="block text-xs text-muted mb-1">Location context (optional — for search volume accuracy)</label>
              <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="e.g., Hamden, Connecticut, United States" className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <p className="text-xs text-dim mt-1">If left blank, search volume will be based on US nationwide data. For local businesses, add the city and state.</p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={addKeywords}>Add {newKeywords.split("\n").filter((k) => k.trim()).length} Keywords</Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions modal */}
      {showSuggest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSuggest(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-3xl max-h-[85vh] flex flex-col p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-1">Auto-Suggested Keywords</h3>
            <p className="text-xs text-muted mb-3">Generated from this client's services and service areas. Keywords include city names for local ranking data.</p>
            {suggestLoading ? <div className="text-sm text-muted py-12 text-center">Generating suggestions from client services + locations...</div> : (
              <div className="flex-1 overflow-y-auto bg-surface-2 rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-2 z-10"><tr className="border-b border-border">
                    <th className="px-3 py-2 w-8"><input type="checkbox" checked={selectedSuggestions.size === (suggestions?.filter((s) => !s.alreadyTracked).length || 0)} onChange={(e) => { if (e.target.checked) setSelectedSuggestions(new Set(suggestions?.filter((s) => !s.alreadyTracked).map((s) => s.keyword) || [])); else setSelectedSuggestions(new Set()); }} /></th>
                    <th className="text-left px-3 py-2 text-dim text-xs">Keyword</th>
                    <th className="text-right px-3 py-2 text-dim text-xs">Volume</th>
                    <th className="text-right px-3 py-2 text-dim text-xs">Difficulty</th>
                  </tr></thead>
                  <tbody>
                    {(suggestions || []).map((s, i) => (
                      <tr key={i} className={cn("border-b border-border last:border-0", s.alreadyTracked ? "opacity-40" : "hover:bg-surface/50")}>
                        <td className="px-3 py-2"><input type="checkbox" disabled={s.alreadyTracked} checked={selectedSuggestions.has(s.keyword)} onChange={() => { const n = new Set(selectedSuggestions); if (n.has(s.keyword)) n.delete(s.keyword); else n.add(s.keyword); setSelectedSuggestions(n); }} /></td>
                        <td className="px-3 py-2 text-foreground">{s.keyword}{s.alreadyTracked && <span className="ml-2 text-xs text-dim">(tracked)</span>}</td>
                        <td className="px-3 py-2 text-right text-muted">{s.searchVolume.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-muted">{s.difficulty ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
              <span className="text-sm text-muted">{selectedSuggestions.size} selected</span>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowSuggest(false)}>Cancel</Button>
                <Button onClick={bulkAddSelected} disabled={bulkAdding || selectedSuggestions.size === 0}>{bulkAdding ? "Adding..." : `Add ${selectedSuggestions.size}`}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Heatmap Tab ──────────────────────────────────

function HeatmapTab({ slug }: { slug: string }) {
  const [scans, setScans] = useState<HeatmapScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLng, setCenterLng] = useState("");
  const [gridSize, setGridSize] = useState(5);
  const [radiusMiles, setRadiusMiles] = useState(1.5);
  const [scanning, setScanning] = useState(false);
  const [selectedScan, setSelectedScan] = useState<{ scan: HeatmapScan; points: HeatmapPoint[] } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    api<HeatmapScan[]>(`/seo/clients/${slug}/heatmap/scans`).then(setScans).catch(() => []).finally(() => setLoading(false));
  }, [slug]);

  // Auto-fetch client location for pre-filling lat/lng
  const autoFillLocation = async () => {
    setGeoLoading(true);
    try {
      const client = await api<Record<string, unknown>>(`/cm/clients/${slug}`);
      // Try GBP coordinates, then geocode from address
      if (client.location && typeof client.location === "string") {
        // Use a free geocoding approach — search the location text
        // For now, prompt user to get from Google Maps
      }
      // Check if we have a stored lat/lng from GBP
      // TODO: Store lat/lng when GBP data is available
    } catch (err) { console.error(err); }
    setGeoLoading(false);
  };

  const runScan = async () => {
    if (!keyword || !centerLat || !centerLng) return;
    setScanning(true);
    try {
      await api(`/seo/clients/${slug}/heatmap/scan`, {
        method: "POST", body: JSON.stringify({ keyword, centerLat: parseFloat(centerLat), centerLng: parseFloat(centerLng), gridSize, radiusMiles }),
      });
      setShowNew(false);
      const updated = await api<HeatmapScan[]>(`/seo/clients/${slug}/heatmap/scans`);
      setScans(updated);
    } catch (err) { console.error(err); alert("Scan failed"); }
    setScanning(false);
  };

  const loadScan = async (scanId: string) => {
    try {
      const data = await api<{ scan: HeatmapScan; points: HeatmapPoint[] }>(`/seo/clients/${slug}/heatmap/scans/${scanId}`);
      setSelectedScan(data);
    } catch (err) { console.error(err); }
  };

  const posColor = (pos: number | null) => {
    if (pos === null) return "bg-gray-200 text-gray-500";
    if (pos <= 3) return "bg-emerald-500 text-white";
    if (pos <= 10) return "bg-amber-400 text-white";
    if (pos <= 20) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div>
      <p className="text-xs text-dim mb-4">
        Local heatmaps show how your client ranks in Google Maps from different locations around their business.
        Each cell in the grid represents a different geographic point — the number is their Google Maps position at that location.
        This reveals where they're strong and where competitors dominate. Run scans for each primary service keyword.
      </p>
      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" onClick={() => setShowNew(true)}>New Scan</Button>
        <span className="text-xs text-dim">{scans.length} scans</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {loading ? <div className="text-sm text-muted">Loading...</div> : scans.length === 0 ? (
            <div className="bg-surface border border-border rounded-md p-4 text-center text-sm text-muted">
              No scans yet. Click "New Scan" to see how this client ranks across their service area in Google Maps.
            </div>
          ) : scans.map((s) => (
            <button key={s.id} onClick={() => loadScan(s.id)}
              className={cn("w-full text-left p-3 rounded-md border transition-colors", selectedScan?.scan.id === s.id ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-2")}>
              <div className="font-medium text-sm text-foreground truncate">{s.keyword}</div>
              <div className="text-xs text-dim mt-0.5">{s.grid_size}x{s.grid_size} · {s.radius_miles}mi · {safeDate(s.scanned_at)}</div>
              {s.top3_count != null && <div className="text-xs text-success mt-0.5">{s.top3_count} top-3 / {s.found_count || 0} found of {s.point_count || 0}</div>}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedScan ? (
            <div className="bg-surface border border-border rounded-md p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">{selectedScan.scan.keyword}</h3>
              <p className="text-xs text-muted mb-4">{selectedScan.scan.business_name} · {selectedScan.scan.grid_size}x{selectedScan.scan.grid_size} · {selectedScan.scan.radius_miles}mi radius</p>
              <div className="flex justify-center">
                <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${selectedScan.scan.grid_size}, minmax(50px, 70px))` }}>
                  {(() => {
                    const grid: (HeatmapPoint | null)[][] = [];
                    for (let r = 0; r < selectedScan.scan.grid_size; r++) grid[r] = new Array(selectedScan.scan.grid_size).fill(null);
                    for (const p of selectedScan.points) { if (grid[p.grid_row]) grid[p.grid_row][p.grid_col] = p; }
                    return grid.flat().map((p, i) => (
                      <div key={i} className={cn("aspect-square rounded flex items-center justify-center font-bold text-lg shadow-sm", posColor(p?.position ?? null))}
                        title={p ? `Position: ${p.position ?? "Not found"}\n${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}${p.top_competitor ? `\nTop competitor: ${p.top_competitor}` : ""}` : ""}>
                        {p?.position ?? (p ? "—" : "")}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> #1-3 (dominant)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> #4-10 (visible)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> #11-20 (weak)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> #21+ (not visible)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200" /> Not ranking</span>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-md p-12 text-center text-muted text-sm">Select a scan or run a new one to visualize local rankings.</div>
          )}
        </div>
      </div>

      {/* New scan modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">New Local Heatmap Scan</h3>
            <p className="text-xs text-muted mb-4">Scans Google Maps results from a grid of locations around the business to show where they rank geographically.</p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-muted mb-1">Search Keyword</label><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g., functional medicine clinic" className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-muted mb-1">Center Latitude</label><input value={centerLat} onChange={(e) => setCenterLat(e.target.value)} placeholder="41.3963" className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" /></div>
                <div><label className="block text-sm font-medium text-muted mb-1">Center Longitude</label><input value={centerLng} onChange={(e) => setCenterLng(e.target.value)} placeholder="-72.8967" className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" /></div>
              </div>
              <p className="text-xs text-dim">
                To get coordinates: open <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Maps</a>, right-click the business location, and click the coordinates to copy them.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-muted mb-1">Grid Size</label><select value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm"><option value="3">3x3 (9 pts, ~$0.005)</option><option value="5">5x5 (25 pts, ~$0.015)</option><option value="7">7x7 (49 pts, ~$0.029)</option></select></div>
                <div><label className="block text-sm font-medium text-muted mb-1">Radius (miles)</label><input type="number" step="0.5" value={radiusMiles} onChange={(e) => setRadiusMiles(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={runScan} disabled={scanning || !keyword || !centerLat || !centerLng}>{scanning ? "Scanning..." : "Run Scan"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audits Tab ──────────────────────────────────

function AuditsTab({ slug, domain }: { slug: string; domain: string }) {
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    api<AuditResult[]>(`/seo/clients/${slug}/audits`).then(setAudits).catch(() => []).finally(() => setLoading(false));
  }, [slug]);

  const runAudit = async () => {
    setAuditing(true);
    try {
      await api(`/seo/clients/${slug}/audit`, { method: "POST", body: JSON.stringify({ url: `https://${domain}` }) });
      setAudits(await api<AuditResult[]>(`/seo/clients/${slug}/audits`));
    } catch (err) { console.error(err); }
    setAuditing(false);
  };

  if (loading) return <div className="text-sm text-muted">Loading audits...</div>;

  const scoreColor = (score?: number) => { if (!score) return "text-muted"; if (score >= 80) return "text-success"; if (score >= 50) return "text-warning"; return "text-destructive"; };
  const scoreLabel = (score?: number) => { if (!score) return "Unknown"; if (score >= 80) return "Good"; if (score >= 50) return "Needs Work"; return "Poor"; };

  return (
    <div>
      <p className="text-xs text-dim mb-4">
        Technical SEO audit checks the client's website for common issues that affect search rankings: page speed, meta tags, broken links, mobile-friendliness, and more.
        The score is 0-100 where 80+ is good. Run audits monthly to catch issues early.
      </p>
      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" onClick={runAudit} disabled={auditing}>{auditing ? "Running audit..." : "Run Audit"}</Button>
        <span className="text-xs text-dim">Audits https://{domain}</span>
      </div>
      {audits.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-sm text-muted">
          No audits yet. Click "Run Audit" to analyze the website for technical SEO issues.
        </div>
      ) : (
        <div className="space-y-4">
          {audits.slice(0, 5).map((a, i) => {
            const score = a.onpageScore ?? a.onpage_score;
            const status = a.statusCode ?? a.status_code;
            const time = a.loadTime ?? a.load_time;
            const broken = a.brokenLinks ?? a.broken_links;
            const dupTitle = a.duplicateTitle ?? a.duplicate_title;
            const dupDesc = a.duplicateDescription ?? a.duplicate_description;
            const sizeKB = a.size ? Math.round(a.size / 1024) : null;

            // Build actionable insights
            const insights: Array<{ text: string; type: "success" | "warning" | "error" }> = [];
            if (score && score >= 80) insights.push({ text: "Overall SEO health is good", type: "success" });
            else if (score && score >= 50) insights.push({ text: "SEO score needs improvement — review issues below", type: "warning" });
            else if (score) insights.push({ text: "Critical SEO issues found — address these urgently", type: "error" });

            if (time && time > 3) insights.push({ text: `Page loads slowly (${(time * 1000).toFixed(0)}ms) — optimize images, enable caching, minimize scripts`, type: "error" });
            else if (time && time > 1.5) insights.push({ text: `Page load is acceptable (${(time * 1000).toFixed(0)}ms) but could be faster`, type: "warning" });
            else if (time) insights.push({ text: `Fast page load (${(time * 1000).toFixed(0)}ms)`, type: "success" });

            if (broken && broken > 0) insights.push({ text: `${broken} broken link${broken > 1 ? "s" : ""} found — fix or remove these to avoid hurting rankings`, type: "error" });
            else insights.push({ text: "No broken links detected", type: "success" });

            if (!a.title) insights.push({ text: "Missing page title — add a unique <title> tag (critical for SEO)", type: "error" });
            else if (a.title.length > 60) insights.push({ text: `Title is ${a.title.length} chars (recommended: under 60)`, type: "warning" });
            else insights.push({ text: "Title tag looks good", type: "success" });

            if (!a.description) insights.push({ text: "Missing meta description — add one to improve click-through rate from search results", type: "error" });

            if (dupTitle) insights.push({ text: "Duplicate title detected — each page should have a unique title", type: "warning" });
            if (dupDesc) insights.push({ text: "Duplicate meta description — write unique descriptions for each page", type: "warning" });

            if (a.h1 && a.h1.length === 0) insights.push({ text: "Missing H1 heading — add a clear primary heading to the page", type: "warning" });
            else if (a.h1 && a.h1.length > 1) insights.push({ text: `Multiple H1 tags (${a.h1.length}) — use only one H1 per page`, type: "warning" });

            return (
              <div key={i} className="bg-surface border border-border rounded-md p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm text-foreground font-medium">{a.url || `https://${domain}`}</span>
                    <span className="text-xs text-dim ml-3">{safeDate(a.audited_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-2xl font-bold", scoreColor(score))}>{score || "—"}</span>
                    <span className={cn("text-xs font-medium", scoreColor(score))}>{scoreLabel(score)}</span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-surface-2 rounded p-2 text-center"><div className="text-xs text-dim">Status</div><div className={cn("text-lg font-bold", status === 200 ? "text-success" : "text-destructive")}>{status || "—"}</div></div>
                  <div className="bg-surface-2 rounded p-2 text-center"><div className="text-xs text-dim">Load Time</div><div className="text-lg font-bold text-foreground">{time ? `${(time * 1000).toFixed(0)}ms` : "—"}</div></div>
                  <div className="bg-surface-2 rounded p-2 text-center"><div className="text-xs text-dim">Page Size</div><div className="text-lg font-bold text-foreground">{sizeKB ? `${sizeKB}KB` : "—"}</div></div>
                  <div className="bg-surface-2 rounded p-2 text-center"><div className="text-xs text-dim">Broken Links</div><div className={cn("text-lg font-bold", broken ? "text-destructive" : "text-success")}>{broken || 0}</div></div>
                </div>

                {/* Meta tags */}
                {(a.title || a.description || (a.h1 && a.h1.length > 0)) && (
                  <div className="bg-surface-2 rounded p-3 mb-4 text-xs space-y-1">
                    {a.title && <div><strong className="text-dim">Title:</strong> <span className="text-foreground">{a.title}</span></div>}
                    {a.description && <div><strong className="text-dim">Description:</strong> <span className="text-foreground">{a.description}</span></div>}
                    {a.h1 && a.h1.length > 0 && <div><strong className="text-dim">H1:</strong> <span className="text-foreground">{a.h1.join(", ")}</span></div>}
                  </div>
                )}

                {/* Actionable insights */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Insights & Actions</h4>
                  {insights.map((ins, j) => (
                    <div key={j} className={cn("text-xs px-2 py-1.5 rounded flex items-start gap-2",
                      ins.type === "success" ? "bg-success/10 text-success" :
                      ins.type === "warning" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    )}>
                      <span className="shrink-0">{ins.type === "success" ? "✓" : ins.type === "warning" ? "⚠" : "✗"}</span>
                      <span>{ins.text}</span>
                    </div>
                  ))}
                </div>

                {/* Technical checks */}
                {a.checks && Object.keys(a.checks).length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Technical Checks</h4>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(a.checks).map(([key, val]) => {
                        const isGood = (key === "is_https" || key === "has_meta_title" || key === "has_meta_description") ? val : !val;
                        const label = key.replace(/_/g, " ").replace(/^is /, "").replace(/^has /, "").replace(/^no /, "missing ");
                        return (
                          <span key={key} className={cn("text-[10px] px-1.5 py-0.5 rounded",
                            isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                            {isGood ? "✓" : "✗"} {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Research Tab ──────────────────────────────────

function ResearchTab({ domain }: { domain: string }) {
  const [subtab, setSubtab] = useState<string>("serp");
  const subs = [
    { key: "serp", label: "SERP Analysis", desc: "See who ranks for any keyword and what type of results appear" },
    { key: "domain", label: "Domain Analytics", desc: "Analyze any domain's traffic, top keywords, and competitors" },
    { key: "onpage", label: "On-Page Audit", desc: "Check any URL for SEO issues (meta tags, speed, structure)" },
    { key: "content", label: "Content Analysis", desc: "Find top-performing content for any topic" },
    { key: "business", label: "Business Listings", desc: "Search Google Maps listings for competitive research" },
  ];
  const activeSub = subs.find((s) => s.key === subtab);

  return (
    <div>
      <p className="text-xs text-dim mb-4">
        Research tools for competitive analysis and content planning. Use these to understand the search landscape for this client's keywords and industry.
      </p>
      <div className="flex gap-1 mb-2">{subs.map((s) => (
        <button key={s.key} onClick={() => setSubtab(s.key)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", subtab === s.key ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>{s.label}</button>
      ))}</div>
      {activeSub && <p className="text-xs text-dim mb-4">{activeSub.desc}</p>}
      <SearchPanel endpoint={
        subtab === "serp" ? "/seo/serp" :
        subtab === "domain" ? "/seo/domain/overview" :
        subtab === "onpage" ? "/seo/onpage" :
        subtab === "content" ? "/seo/content" :
        "/seo/business"
      } placeholder={
        subtab === "serp" ? `e.g., functional medicine ${domain.split(".")[0]}` :
        subtab === "domain" ? `e.g., ${domain} or a competitor domain` :
        subtab === "onpage" ? `e.g., https://${domain}/` :
        subtab === "content" ? "e.g., functional medicine benefits" :
        `e.g., naturopathic doctor ${domain.split(".")[0]}`
      } defaultValue={subtab === "domain" ? domain : subtab === "onpage" ? `https://${domain}/` : ""} />
    </div>
  );
}

function SearchPanel({ endpoint, placeholder, defaultValue }: { endpoint: string; placeholder: string; defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  // Reset query when defaultValue changes (tab switch)
  useEffect(() => { setQuery(defaultValue || ""); setResult(null); }, [defaultValue]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const body = endpoint.includes("domain") ? { domain: query.trim() }
        : endpoint.includes("onpage") ? { url: query.trim() }
        : { keyword: query.trim() };
      setResult(await api(endpoint, { method: "POST", body: JSON.stringify(body) }));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={placeholder} className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
        <Button size="sm" onClick={search} disabled={loading}>{loading ? "Loading..." : "Search"}</Button>
      </div>
      {result && (
        <div className="bg-surface border border-border rounded-md p-4">
          <pre className="text-xs text-foreground max-h-[500px] overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
          <p className="text-xs text-dim mt-3">Raw API response — formatted displays coming soon for each research type.</p>
        </div>
      )}
    </div>
  );
}
