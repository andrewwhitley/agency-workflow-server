import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Globe, Users, BarChart3, RefreshCw } from "lucide-react";

interface DomainOverview {
  target: string;
  organicTraffic: number;
  organicKeywords: number;
  rank: number;
  backlinks?: number;
  referringDomains?: number;
}

interface RankedKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
  cpc: number;
  difficulty?: number;
}

interface DomainCompetitor {
  domain: string;
  avgPosition: number;
  keywordIntersections: number;
  organicTraffic?: number;
}

interface MarketIntelData {
  domain: string;
  overview: DomainOverview | null;
  keywords: RankedKeyword[];
  competitors: DomainCompetitor[];
  error?: string;
}

export function MarketIntelSection({ clientId }: { clientId: number }) {
  const [data, setData] = useState<MarketIntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<MarketIntelData>(`/cm/clients/${clientId}/market-intel`);
      if (result.error) { setError(result.error); }
      else { setData(result); }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to fetch"); }
    setLoading(false);
  }, [clientId]);

  if (!data && !loading) {
    return (
      <div className="border border-border rounded-lg bg-surface p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Market Intelligence</h3>
          </div>
        </div>
        <p className="text-xs text-dim mb-4">Pull organic rankings, competitor landscape, and keyword data from DataForSEO. Uses ~0.05 credits per pull.</p>
        {error && <div className="text-sm text-destructive mb-3">{error}</div>}
        <Button size="sm" onClick={fetchIntel} disabled={loading}>
          <Search className="h-3 w-3 mr-1.5" /> Pull Market Data
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-dim">
          <RefreshCw className="h-4 w-4 animate-spin" /> Fetching market intelligence...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ov = data.overview;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Market Intelligence</h3>
          <span className="text-[10px] text-dim">{data.domain}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchIntel} disabled={loading}>
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Domain Overview */}
      {ov && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Organic Traffic", value: ov.organicTraffic?.toLocaleString() || "0", icon: TrendingUp, color: "text-green-400" },
            { label: "Ranked Keywords", value: ov.organicKeywords?.toLocaleString() || "0", icon: Search, color: "text-blue-400" },
            { label: "Domain Rank", value: ov.rank?.toLocaleString() || "—", icon: Globe, color: "text-purple-400" },
            { label: "Backlinks", value: ov.backlinks?.toLocaleString() || "—", icon: Users, color: "text-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface border border-border rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                <span className="text-[10px] text-dim uppercase tracking-wide">{stat.label}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top Keywords */}
      {data.keywords.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Top Ranked Keywords</span>
            <span className="text-[10px] text-dim">{data.keywords.length} keywords</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-dim uppercase tracking-wide border-b border-border">
                  <th className="text-left px-3 py-1.5">Keyword</th>
                  <th className="text-right px-3 py-1.5 w-16">Pos</th>
                  <th className="text-right px-3 py-1.5 w-20">Volume</th>
                  <th className="text-right px-3 py-1.5 w-16">KD</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.map((kw, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-surface-2">
                    <td className="px-3 py-1.5 text-foreground">{kw.keyword}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={cn("font-medium",
                        kw.position <= 3 ? "text-green-400" :
                        kw.position <= 10 ? "text-blue-400" :
                        kw.position <= 20 ? "text-amber-400" : "text-dim"
                      )}>{kw.position}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right text-dim">{kw.searchVolume?.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right text-dim">{kw.difficulty ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competitors */}
      {data.competitors.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface border-b border-border">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Organic Competitors</span>
          </div>
          <div className="max-h-[250px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-dim uppercase tracking-wide border-b border-border">
                  <th className="text-left px-3 py-1.5">Domain</th>
                  <th className="text-right px-3 py-1.5 w-24">Shared KWs</th>
                  <th className="text-right px-3 py-1.5 w-24">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {data.competitors.map((c, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-surface-2">
                    <td className="px-3 py-1.5 text-foreground">{c.domain}</td>
                    <td className="px-3 py-1.5 text-right text-dim">{c.keywordIntersections}</td>
                    <td className="px-3 py-1.5 text-right text-dim">{c.organicTraffic?.toLocaleString() || "—"}</td>
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
