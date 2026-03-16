import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SerpItem {
  position: number;
  type: string;
  title: string;
  url: string;
  description?: string;
}

interface SerpResult {
  items: SerpItem[];
  relatedSearches?: string[];
  peopleAlsoAsk?: string[];
  totalResults?: number;
}

export function SerpAnalysisPage() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<SerpResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await api<SerpResult>("/seo/serp", {
        method: "POST",
        body: JSON.stringify({ keyword, depth: 20 }),
      });
      setResult(res);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">SERP Analysis</h2>

      <div className="flex gap-2 mb-6">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Enter a keyword to analyze SERP..."
          className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        <button onClick={search} disabled={loading || !keyword.trim()}
          className={cn("px-4 py-2 rounded-md text-sm font-medium", loading ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {loading ? "Searching..." : "Analyze"}
        </button>
      </div>

      {result && (
        <>
          {/* SERP results */}
          <div className="bg-surface border border-border rounded-md overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-4 py-3 font-medium text-dim w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-dim">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.items?.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3 text-dim font-mono">{item.position}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
                        item.type === "featured_snippet" && "bg-warning/10 text-warning",
                        item.type === "local_pack" && "bg-accent/10 text-accent",
                        item.type === "organic" && "bg-surface-2 text-dim",
                      )}>{item.type?.replace("_", " ") || "organic"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">{item.title}</div>
                      <div className="text-xs text-accent truncate">{item.url}</div>
                      {item.description && <div className="text-xs text-muted mt-1 line-clamp-2">{item.description}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* People Also Ask */}
          {result.peopleAlsoAsk && result.peopleAlsoAsk.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">People Also Ask</h3>
              <div className="space-y-2">
                {result.peopleAlsoAsk.map((q, i) => (
                  <div key={i} className="bg-surface border border-border rounded-md px-4 py-2 text-sm text-foreground">
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Searches */}
          {result.relatedSearches && result.relatedSearches.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Related Searches</h3>
              <div className="flex flex-wrap gap-2">
                {result.relatedSearches.map((s, i) => (
                  <button key={i} onClick={() => { setKeyword(s); }}
                    className="px-3 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
