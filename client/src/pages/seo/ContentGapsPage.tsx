import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClientSelector } from "@/hooks/useClientSelector";
import { ClientSelector } from "@/components/ClientSelector";

interface Competitor {
  domain: string;
  avgPosition: number;
  keywordIntersections: number;
}

interface GapKeyword {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  competitors: string[];
}

export function ContentGapsPage() {
  const { clients, slug, setSlug, client, loading: clientsLoading } = useClientSelector();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gaps, setGaps] = useState<GapKeyword[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingComps, setLoadingComps] = useState(false);
  const [totalGaps, setTotalGaps] = useState(0);

  useEffect(() => {
    if (!client?.domain) return;
    setLoadingComps(true);
    api<{ competitors: Competitor[] }>("/seo/domain/competitors", {
      method: "POST",
      body: JSON.stringify({ domain: client.domain }),
    }).then((d) => {
      setCompetitors(d.competitors || []);
      setSelected(new Set());
      setGaps([]);
    }).catch(console.error).finally(() => setLoadingComps(false));
  }, [client?.domain]);

  const toggleComp = (domain: string) => {
    const next = new Set(selected);
    if (next.has(domain)) next.delete(domain); else next.add(domain);
    setSelected(next);
  };

  const analyze = async () => {
    if (!client?.domain || selected.size === 0) return;
    setAnalyzing(true);
    try {
      const res = await api<{ gaps: GapKeyword[]; totalGaps: number }>("/seo/content-gaps", {
        method: "POST",
        body: JSON.stringify({
          domain: client.domain,
          competitorDomains: Array.from(selected),
        }),
      });
      setGaps(res.gaps);
      setTotalGaps(res.totalGaps);
    } catch (err) { console.error(err); }
    setAnalyzing(false);
  };

  const addToTracker = async (keyword: string) => {
    await api(`/seo/clients/${slug}/keywords`, {
      method: "POST",
      body: JSON.stringify({ keywords: [keyword] }),
    });
    alert(`"${keyword}" added to tracker`);
  };

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Content Gaps</h2>
        <ClientSelector clients={clients} value={slug} onChange={setSlug} />
      </div>

      {!client?.domain ? (
        <div className="bg-warning/10 border border-warning/20 rounded-md p-4 text-sm text-warning">
          No domain configured for this client.
        </div>
      ) : (
        <>
          {/* Competitors */}
          <h3 className="text-sm font-semibold text-foreground mb-3">Select Competitors to Compare</h3>
          {loadingComps ? (
            <div className="text-sm text-muted mb-4">Loading competitors...</div>
          ) : competitors.length === 0 ? (
            <div className="text-sm text-muted mb-4">No competitors found for {client.domain}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
              {competitors.slice(0, 12).map((c) => (
                <label key={c.domain} className={cn(
                  "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                  selected.has(c.domain) ? "border-accent bg-accent/5" : "border-border bg-surface hover:bg-surface-2"
                )}>
                  <input type="checkbox" checked={selected.has(c.domain)} onChange={() => toggleComp(c.domain)} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.domain}</div>
                    <div className="text-xs text-dim">{c.keywordIntersections} shared keywords</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <button onClick={analyze} disabled={analyzing || selected.size === 0}
            className={cn("px-4 py-2 rounded-md text-sm font-medium mb-6",
              analyzing || selected.size === 0 ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
            {analyzing ? "Analyzing..." : `Analyze Gaps (${selected.size} competitors)`}
          </button>

          {/* Gap results */}
          {gaps.length > 0 && (
            <>
              <div className="text-sm text-muted mb-3">{totalGaps} total keyword gaps found. Showing top opportunities:</div>
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left px-4 py-3 font-medium text-dim">Keyword</th>
                      <th className="text-left px-4 py-3 font-medium text-dim">Volume</th>
                      <th className="text-left px-4 py-3 font-medium text-dim">Difficulty</th>
                      <th className="text-left px-4 py-3 font-medium text-dim">CPC</th>
                      <th className="text-left px-4 py-3 font-medium text-dim">Competitors</th>
                      <th className="text-right px-4 py-3 font-medium text-dim">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((g, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                        <td className="px-4 py-3 text-foreground font-medium">{g.keyword}</td>
                        <td className="px-4 py-3">
                          <span className={cn("font-medium", g.searchVolume >= 1000 ? "text-success" : g.searchVolume >= 100 ? "text-accent" : "text-muted")}>
                            {g.searchVolume.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("font-medium", g.difficulty <= 30 ? "text-success" : g.difficulty <= 60 ? "text-warning" : "text-destructive")}>
                            {g.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">${g.cpc.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-dim">{g.competitors.join(", ")}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => addToTracker(g.keyword)} className="text-xs text-accent hover:underline">Track</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
