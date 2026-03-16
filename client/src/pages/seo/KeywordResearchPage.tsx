import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClientSelector } from "@/hooks/useClientSelector";
import { ClientSelector } from "@/components/ClientSelector";

interface KeywordResult {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: string;
  keywordDifficulty?: number;
}

export function KeywordResearchPage() {
  const { clients, slug, setSlug, loading: clientsLoading } = useClientSelector();
  const [seed, setSeed] = useState("");
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"suggest" | "enrich">("suggest");
  const [enrichInput, setEnrichInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const suggest = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    try {
      const res = await api<{ suggestions: KeywordResult[] }>("/content-management/keywords/suggest", {
        method: "POST",
        body: JSON.stringify({ seed, limit: 50 }),
      });
      setResults(res.suggestions || []);
      setSelected(new Set());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const enrich = async () => {
    const keywords = enrichInput.split("\n").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;
    setLoading(true);
    try {
      const res = await api<{ metrics: KeywordResult[] }>("/content-management/keywords/enrich", {
        method: "POST",
        body: JSON.stringify({ keywords }),
      });
      setResults(res.metrics || []);
      setSelected(new Set());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleSelect = (kw: string) => {
    const next = new Set(selected);
    if (next.has(kw)) next.delete(kw); else next.add(kw);
    setSelected(next);
  };

  const addToTracker = async () => {
    if (selected.size === 0 || !slug) return;
    await api(`/seo/clients/${slug}/keywords`, {
      method: "POST",
      body: JSON.stringify({ keywords: Array.from(selected) }),
    });
    alert(`${selected.size} keywords added to tracker for ${slug}`);
    setSelected(new Set());
  };

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Keyword Research</h2>
        <ClientSelector clients={clients} value={slug} onChange={setSlug} />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("suggest")}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium", mode === "suggest" ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          Suggestions
        </button>
        <button onClick={() => setMode("enrich")}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium", mode === "enrich" ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          Enrich Keywords
        </button>
      </div>

      {/* Input */}
      {mode === "suggest" ? (
        <div className="flex gap-2 mb-6">
          <input value={seed} onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && suggest()}
            placeholder="Enter a seed keyword..."
            className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
          <button onClick={suggest} disabled={loading}
            className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
            {loading ? "Loading..." : "Get Suggestions"}
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <textarea value={enrichInput} onChange={(e) => setEnrichInput(e.target.value)} rows={5}
            placeholder="Paste keywords (one per line) to get metrics..."
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent mb-2" />
          <button onClick={enrich} disabled={loading}
            className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
            {loading ? "Loading..." : "Get Metrics"}
          </button>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-accent/5 border border-accent/20 rounded-md">
          <span className="text-sm text-foreground">{selected.size} selected</span>
          <button onClick={addToTracker} className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
            Add to Tracker
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={selected.size === results.length}
                    onChange={() => setSelected(selected.size === results.length ? new Set() : new Set(results.map((r) => r.keyword)))} />
                </th>
                <th className="text-left px-4 py-3 font-medium text-dim">Keyword</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Volume</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Difficulty</th>
                <th className="text-left px-4 py-3 font-medium text-dim">CPC</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Competition</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.keyword} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.keyword)} onChange={() => toggleSelect(r.keyword)} />
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{r.keyword}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-medium",
                      r.searchVolume >= 1000 ? "text-success" : r.searchVolume >= 100 ? "text-accent" : "text-muted")}>
                      {r.searchVolume.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-medium",
                      (r.keywordDifficulty || 0) <= 30 ? "text-success" : (r.keywordDifficulty || 0) <= 60 ? "text-warning" : "text-destructive")}>
                      {r.keywordDifficulty ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">${r.cpc.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-dim">{r.competitionLevel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
