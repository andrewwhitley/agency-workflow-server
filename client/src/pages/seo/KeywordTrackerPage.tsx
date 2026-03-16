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
}

export function KeywordTrackerPage() {
  const { clients, slug, setSlug, loading: clientsLoading } = useClientSelector();
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKeywords, setNewKeywords] = useState("");

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

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Keyword Tracker</h2>
        <div className="flex gap-2">
          <ClientSelector clients={clients} value={slug} onChange={setSlug} />
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
            Add Keywords
          </button>
          <button onClick={checkNow} disabled={checking || keywords.length === 0}
            className={cn("px-4 py-2 rounded-md text-sm font-medium", checking ? "bg-surface-2 text-dim" : "bg-surface-2 text-muted hover:bg-surface-3")}>
            {checking ? "Checking..." : "Check Now"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading tracked keywords...</div>
      ) : keywords.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No keywords being tracked. Add keywords to start monitoring rankings.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 font-medium text-dim">Keyword</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Position</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Change</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Volume</th>
                <th className="text-left px-4 py-3 font-medium text-dim">URL</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Last Checked</th>
                <th className="text-right px-4 py-3 font-medium text-dim">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => {
                const delta = positionDelta(kw.current_position, kw.previous_position);
                return (
                  <tr key={kw.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3 text-foreground font-medium">{kw.keyword}</td>
                    <td className="px-4 py-3">
                      {kw.current_position ? (
                        <span className={cn("font-mono font-medium",
                          kw.current_position <= 3 ? "text-success" :
                          kw.current_position <= 10 ? "text-accent" : "text-muted"
                        )}>{kw.current_position}</span>
                      ) : <span className="text-dim">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {delta != null ? (
                        <span className={cn("text-sm font-medium",
                          delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-dim"
                        )}>
                          {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                        </span>
                      ) : <span className="text-dim">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{kw.search_volume?.toLocaleString() || "—"}</td>
                    <td className="px-4 py-3 text-xs text-dim truncate max-w-[200px]">{kw.ranking_url || "—"}</td>
                    <td className="px-4 py-3 text-xs text-dim">
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
    </div>
  );
}
