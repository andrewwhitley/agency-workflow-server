import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClientSelector } from "@/hooks/useClientSelector";
import { ClientSelector } from "@/components/ClientSelector";

interface TrackedKeyword {
  id: string;
  keyword: string;
  current_position: number | null;
  previous_position: number | null;
  search_volume: number | null;
  ranking_url: string | null;
  last_checked: string | null;
  track_local_pack?: boolean;
  source?: string;
  check_frequency?: string;
  priority?: string;
}

interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  difficulty: number | null;
  cpc: number;
  competition: string | null;
  alreadyTracked: boolean;
}

interface SeedSuggestionResponse {
  suggestions: KeywordSuggestion[];
  totalGenerated: number;
  totalReturned: number;
  services: string[];
  cities: string[];
  sources: { servicesCount: number; citiesCount: number; brandStoryAvailable: boolean };
}

export function KeywordTrackerPage() {
  const { clients, slug, setSlug, loading: clientsLoading } = useClientSelector();
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKeywords, setNewKeywords] = useState("");

  // Suggestions state
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SeedSuggestionResponse | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const fetchKeywords = () => {
    if (!slug) return;
    setLoading(true);
    api<TrackedKeyword[]>(`/seo/clients/${slug}/keywords`)
      .then(setKeywords)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchKeywords(); }, [slug]);

  const addKeywords = async () => {
    const kws = newKeywords.split("\n").map((k) => k.trim()).filter(Boolean);
    if (kws.length === 0) return;
    await api(`/seo/clients/${slug}/keywords`, {
      method: "POST",
      body: JSON.stringify({ keywords: kws }),
    });
    setNewKeywords("");
    setShowAdd(false);
    fetchKeywords();
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await api(`/seo/clients/${slug}/keywords/check`, { method: "POST" });
      fetchKeywords();
    } catch (err) { console.error(err); }
    setChecking(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this keyword from tracking?")) return;
    await api(`/seo/clients/${slug}/keywords/${id}`, { method: "DELETE" });
    fetchKeywords();
  };

  const positionDelta = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null) return null;
    return prev - curr; // positive = improved
  };

  // ── Auto-generate suggestions ──
  const loadSuggestions = async () => {
    if (!slug) return;
    setSuggestLoading(true);
    setSelectedSuggestions(new Set());
    try {
      const data = await api<SeedSuggestionResponse>(`/seo/clients/${slug}/keywords/suggest-seeds`, {
        method: "POST",
        body: JSON.stringify({ locationCode: 2840 }),
      });
      setSuggestions(data);
      // Pre-select all non-tracked suggestions with volume > 10
      const preselect = new Set<string>();
      for (const s of data.suggestions) {
        if (!s.alreadyTracked && s.searchVolume > 10) preselect.add(s.keyword);
      }
      setSelectedSuggestions(preselect);
    } catch (err) { console.error(err); alert("Failed to generate suggestions"); }
    setSuggestLoading(false);
  };

  const openSuggest = () => {
    setShowSuggest(true);
    if (!suggestions) loadSuggestions();
  };

  const toggleSuggestion = (keyword: string) => {
    const next = new Set(selectedSuggestions);
    if (next.has(keyword)) next.delete(keyword);
    else next.add(keyword);
    setSelectedSuggestions(next);
  };

  const bulkAddSelected = async () => {
    if (selectedSuggestions.size === 0) return;
    setBulkAdding(true);
    try {
      await api(`/seo/clients/${slug}/keywords/bulk-add`, {
        method: "POST",
        body: JSON.stringify({
          keywords: Array.from(selectedSuggestions),
          source: "auto-suggested",
          trackLocalPack: true,
        }),
      });
      setShowSuggest(false);
      setSuggestions(null);
      fetchKeywords();
    } catch (err) { console.error(err); }
    setBulkAdding(false);
  };

  // ── Schedule weekly checks ──
  const scheduleWeekly = async () => {
    if (!slug) return;
    setScheduling(true);
    try {
      await api("/scheduler/jobs", {
        method: "POST",
        body: JSON.stringify({
          name: `SEO check: ${slug}`,
          description: `Weekly SEO rank check for ${slug}`,
          cron_expression: "0 6 * * 1", // Monday 6am
          job_type: "seo_check",
          config: { client_slug: slug },
          enabled: true,
        }),
      });
      setShowSchedule(false);
      alert("Weekly SEO check scheduled (Mondays at 6am).");
    } catch (err) {
      console.error(err);
      alert("Failed to schedule check. It may already be scheduled.");
    }
    setScheduling(false);
  };

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-foreground">Keyword Tracker</h2>
        <div className="flex gap-2 flex-wrap">
          <ClientSelector clients={clients} value={slug} onChange={setSlug} />
          <button onClick={openSuggest} disabled={!slug}
            className="px-3 py-2 rounded-md text-sm font-medium bg-surface-2 text-foreground hover:bg-surface-3 disabled:opacity-40">
            Suggest from Client Data
          </button>
          <button onClick={() => setShowAdd(true)} disabled={!slug}
            className="px-3 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3 disabled:opacity-40">
            Add Manually
          </button>
          <button onClick={() => setShowSchedule(true)} disabled={!slug || keywords.length === 0}
            className="px-3 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3 disabled:opacity-40">
            Schedule Checks
          </button>
          <button onClick={checkNow} disabled={checking || keywords.length === 0}
            className={cn("px-4 py-2 rounded-md text-sm font-medium", checking ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
            {checking ? "Checking..." : "Check Now"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading tracked keywords...</div>
      ) : keywords.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center">
          <p className="text-muted mb-3">No keywords being tracked yet</p>
          <p className="text-xs text-dim mb-4">Click <strong>Suggest from Client Data</strong> to auto-generate keywords from this client's services and locations.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 font-medium text-dim">Keyword</th>
                <th className="text-left px-3 py-3 font-medium text-dim">Org. Pos</th>
                <th className="text-left px-3 py-3 font-medium text-dim">Map Pack</th>
                <th className="text-left px-3 py-3 font-medium text-dim">Change</th>
                <th className="text-left px-3 py-3 font-medium text-dim">Volume</th>
                <th className="text-left px-3 py-3 font-medium text-dim">Source</th>
                <th className="text-left px-3 py-3 font-medium text-dim">Last Checked</th>
                <th className="text-right px-4 py-3 font-medium text-dim">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => {
                const delta = positionDelta(kw.current_position, kw.previous_position);
                return (
                  <tr key={kw.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3 text-foreground font-medium">{kw.keyword}</td>
                    <td className="px-3 py-3">
                      {kw.current_position ? (
                        <span className={cn("font-mono font-medium",
                          kw.current_position <= 3 ? "text-success" :
                          kw.current_position <= 10 ? "text-accent" : "text-muted"
                        )}>{kw.current_position}</span>
                      ) : <span className="text-dim">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {kw.track_local_pack ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">tracked</span>
                      ) : <span className="text-dim text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {delta != null ? (
                        <span className={cn("text-sm font-medium",
                          delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-dim"
                        )}>
                          {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                        </span>
                      ) : <span className="text-dim">—</span>}
                    </td>
                    <td className="px-3 py-3 text-muted">{kw.search_volume?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-3">
                      {kw.source && kw.source !== "manual" ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-dim">{kw.source.replace("-", " ")}</span>
                      ) : <span className="text-dim text-xs">manual</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-dim">
                      {kw.last_checked ? new Date(kw.last_checked).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(kw.id)} className="text-xs text-destructive hover:underline">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Keywords Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Keywords to Track</h3>
            <p className="text-sm text-muted mb-3">One keyword per line</p>
            <textarea value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} rows={8}
              placeholder={"acupuncture hamden ct\nnaturopathic doctor near me\ntcm herbal medicine"}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={addKeywords} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
                Add {newKeywords.split("\n").filter((k) => k.trim()).length} Keywords
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Keywords Modal */}
      {showSuggest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSuggest(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-3xl max-h-[85vh] flex flex-col p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">Auto-Suggested Keywords</h3>
            {suggestions && (
              <p className="text-xs text-muted mb-3">
                Generated from {suggestions.sources.servicesCount} services × {suggestions.sources.citiesCount} cities.
                {suggestions.suggestions.filter((s) => !s.alreadyTracked).length} new suggestions, sorted by search volume.
              </p>
            )}

            {suggestLoading ? (
              <div className="text-sm text-muted py-12 text-center">Generating keyword suggestions...</div>
            ) : !suggestions ? (
              <div className="text-sm text-muted py-12 text-center">No suggestions yet</div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-surface-2 rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-2 z-10">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox"
                          checked={selectedSuggestions.size === suggestions.suggestions.filter((s) => !s.alreadyTracked).length && selectedSuggestions.size > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuggestions(new Set(suggestions.suggestions.filter((s) => !s.alreadyTracked).map((s) => s.keyword)));
                            } else {
                              setSelectedSuggestions(new Set());
                            }
                          }} />
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-dim">Keyword</th>
                      <th className="text-left px-3 py-2 font-medium text-dim">Volume</th>
                      <th className="text-left px-3 py-2 font-medium text-dim">Difficulty</th>
                      <th className="text-left px-3 py-2 font-medium text-dim">CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.suggestions.map((s, i) => (
                      <tr key={i} className={cn("border-b border-border last:border-0",
                        s.alreadyTracked ? "opacity-40" : "hover:bg-surface/50"
                      )}>
                        <td className="px-3 py-2">
                          <input type="checkbox"
                            disabled={s.alreadyTracked}
                            checked={selectedSuggestions.has(s.keyword)}
                            onChange={() => toggleSuggestion(s.keyword)} />
                        </td>
                        <td className="px-3 py-2 text-foreground font-medium">
                          {s.keyword}
                          {s.alreadyTracked && <span className="ml-2 text-xs text-dim">(already tracked)</span>}
                        </td>
                        <td className="px-3 py-2 text-muted">{s.searchVolume.toLocaleString()}</td>
                        <td className="px-3 py-2 text-muted">{s.difficulty ?? "—"}</td>
                        <td className="px-3 py-2 text-muted">${s.cpc.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
              <span className="text-sm text-muted">{selectedSuggestions.size} selected</span>
              <div className="flex gap-3">
                <button onClick={() => setShowSuggest(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
                <button onClick={loadSuggestions} disabled={suggestLoading}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-foreground hover:bg-surface-3">
                  {suggestLoading ? "..." : "Refresh"}
                </button>
                <button onClick={bulkAddSelected} disabled={bulkAdding || selectedSuggestions.size === 0}
                  className={cn("px-4 py-2 rounded-md text-sm font-medium",
                    bulkAdding || selectedSuggestions.size === 0 ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
                  {bulkAdding ? "Adding..." : `Add ${selectedSuggestions.size} keywords`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSchedule(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Schedule Weekly Rank Checks</h3>
            <p className="text-sm text-muted mb-4">
              This will register a recurring job that checks all tracked keywords for this client every Monday at 6am.
              Results will be saved automatically and you'll see position changes in the tracker.
            </p>
            <div className="bg-surface-2 rounded-md p-3 mb-4 text-xs text-dim font-mono">
              0 6 * * 1 (every Monday 6:00 AM)
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSchedule(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={scheduleWeekly} disabled={scheduling}
                className={cn("px-4 py-2 rounded-md text-sm font-medium", scheduling ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
                {scheduling ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
