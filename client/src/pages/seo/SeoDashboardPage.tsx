import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClientSelector } from "@/hooks/useClientSelector";
import { ClientSelector } from "@/components/ClientSelector";

interface DomainSnapshot {
  organic_traffic: number;
  organic_keywords: number;
  rank: number;
  backlinks: number;
  referring_domains: number;
  snapshot_date: string;
}

interface RankedKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
}

export function SeoDashboardPage() {
  const { clients, slug, setSlug, client, loading: clientsLoading } = useClientSelector();
  const [snapshots, setSnapshots] = useState<DomainSnapshot[]>([]);
  const [topKeywords, setTopKeywords] = useState<RankedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api<DomainSnapshot[]>(`/seo/clients/${slug}/domain/history`).catch(() => []),
      api<{ keywords: RankedKeyword[] }>("/seo/domain/keywords", {
        method: "POST",
        body: JSON.stringify({ domain: client?.domain || "" }),
      }).then((d) => d.keywords || []).catch(() => []),
    ]).then(([snaps, kws]) => {
      setSnapshots(snaps);
      setTopKeywords(kws);
    }).finally(() => setLoading(false));
  }, [slug, client?.domain]);

  const takeSnapshot = async () => {
    setSnapshotting(true);
    try {
      await api(`/seo/clients/${slug}/domain/snapshot`, { method: "POST" });
      const snaps = await api<DomainSnapshot[]>(`/seo/clients/${slug}/domain/history`);
      setSnapshots(snaps);
    } catch (err) { console.error(err); }
    setSnapshotting(false);
  };

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  const latest = snapshots[0];

  const statCards = latest ? [
    { label: "Organic Traffic", value: latest.organic_traffic?.toLocaleString() || "—", color: "text-accent" },
    { label: "Organic Keywords", value: latest.organic_keywords?.toLocaleString() || "—", color: "text-foreground" },
    { label: "Domain Rank", value: latest.rank || "—", color: "text-success" },
    { label: "Backlinks", value: latest.backlinks?.toLocaleString() || "—", color: "text-foreground" },
    { label: "Referring Domains", value: latest.referring_domains?.toLocaleString() || "—", color: "text-foreground" },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">SEO Dashboard</h2>
        <div className="flex gap-2">
          <ClientSelector clients={clients} value={slug} onChange={setSlug} />
          <button onClick={takeSnapshot} disabled={snapshotting || !client?.domain}
            className={cn("px-4 py-2 rounded-md text-sm font-medium", snapshotting || !client?.domain ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
            {snapshotting ? "Snapshotting..." : "Take Snapshot"}
          </button>
        </div>
      </div>

      {!client?.domain && (
        <div className="bg-warning/10 border border-warning/20 rounded-md p-4 mb-6 text-sm text-warning">
          No domain configured for this client. Add a "domain" field to the client config to enable SEO tracking.
        </div>
      )}

      {/* Stat cards */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((c) => (
            <div key={c.label} className="bg-surface border border-border rounded-md p-4">
              <div className="text-xs text-dim uppercase tracking-wide mb-1">{c.label}</div>
              <div className={cn("text-2xl font-semibold", c.color)}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trend sparkline */}
      {snapshots.length > 1 && (
        <div className="bg-surface border border-border rounded-md p-5 mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Organic Traffic Trend</h3>
          <div className="flex items-end gap-1 h-16">
            {[...snapshots].reverse().map((s, i) => {
              const max = Math.max(...snapshots.map((x) => x.organic_traffic || 0));
              const h = max > 0 ? ((s.organic_traffic || 0) / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-accent/20 rounded-t" style={{ height: `${h}%`, minHeight: "2px" }}>
                    <div className="w-full h-full bg-accent rounded-t" />
                  </div>
                  <span className="text-[9px] text-dim">{new Date(s.snapshot_date).toLocaleDateString(undefined, { month: "short" })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top keywords */}
      <h3 className="text-lg font-semibold text-foreground mb-4">Top Ranked Keywords</h3>
      {loading ? (
        <div className="text-sm text-muted">Loading keyword data...</div>
      ) : topKeywords.length > 0 ? (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 font-medium text-dim">#</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Keyword</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Position</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Volume</th>
                <th className="text-left px-4 py-3 font-medium text-dim">URL</th>
              </tr>
            </thead>
            <tbody>
              {topKeywords.slice(0, 20).map((kw, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 text-dim">{i + 1}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{kw.keyword}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-mono font-medium", kw.position <= 3 ? "text-success" : kw.position <= 10 ? "text-accent" : "text-muted")}>
                      {kw.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{kw.searchVolume?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-dim truncate max-w-[250px]">{kw.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          {client?.domain ? "No keyword data yet. Take a snapshot or check keywords to get started." : "Configure a domain to see keyword data."}
        </div>
      )}
    </div>
  );
}
