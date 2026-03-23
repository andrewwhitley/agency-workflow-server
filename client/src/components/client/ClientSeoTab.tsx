import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Globe, TrendingUp, Search, FileSearch, Lightbulb, RefreshCw,
  ChevronDown, ChevronRight, ExternalLink, AlertTriangle, CheckCircle,
} from "lucide-react";

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

interface AuditResult {
  url: string;
  statusCode?: number;
  status_code?: number;
  onpageScore?: number;
  onpage_score?: number;
  title?: string;
  description?: string;
  h1?: string[];
  loadTime?: number;
  load_time?: number;
  brokenLinks?: number;
  broken_links?: number;
  duplicateTitle?: boolean;
  duplicate_title?: boolean;
  duplicateDescription?: boolean;
  duplicate_description?: boolean;
  audited_at?: string;
}

export function ClientSeoTab({ clientSlug, clientDomain }: { clientSlug: string; clientDomain: string }) {
  const [snapshots, setSnapshots] = useState<DomainSnapshot[]>([]);
  const [keywords, setKeywords] = useState<RankedKeyword[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["overview"]));

  const toggle = (key: string) => setExpanded((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  useEffect(() => {
    if (!clientSlug || !clientDomain) { setLoading(false); return; }
    Promise.all([
      api<DomainSnapshot[]>(`/seo/clients/${clientSlug}/domain/history`).catch(() => []),
      api<{ keywords: RankedKeyword[] }>("/seo/domain/keywords", {
        method: "POST", body: JSON.stringify({ domain: clientDomain }),
      }).then((d) => d.keywords || []).catch(() => []),
      api<AuditResult[]>(`/seo/clients/${clientSlug}/audits`).catch(() => []),
    ]).then(([s, k, a]) => { setSnapshots(s); setKeywords(k); setAuditHistory(a); })
      .finally(() => setLoading(false));
  }, [clientSlug, clientDomain]);

  const takeSnapshot = async () => {
    setSnapshotting(true);
    try {
      await api(`/seo/clients/${clientSlug}/domain/snapshot`, { method: "POST" });
      const snaps = await api<DomainSnapshot[]>(`/seo/clients/${clientSlug}/domain/history`);
      setSnapshots(snaps);
    } catch (err) { console.error(err); }
    setSnapshotting(false);
  };

  const runAudit = async () => {
    if (!clientDomain) return;
    setAuditing(true);
    try {
      await api(`/seo/clients/${clientSlug}/audit`, {
        method: "POST", body: JSON.stringify({ url: `https://${clientDomain}` }),
      });
      const audits = await api<AuditResult[]>(`/seo/clients/${clientSlug}/audits`).catch(() => []);
      setAuditHistory(audits);
    } catch (err) { console.error(err); }
    setAuditing(false);
  };

  if (!clientDomain) {
    return <div className="text-sm text-dim">No domain configured for this client. Add a domain in the Info tab to enable SEO tracking.</div>;
  }

  if (loading) return <div className="text-sm text-dim">Loading SEO data...</div>;

  const latest = snapshots[0];

  return (
    <div className="space-y-4">
      {/* Domain Overview */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle("overview")} className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Domain Overview</span>
            <span className="text-xs text-dim">{clientDomain}</span>
          </div>
          {expanded.has("overview") ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
        </button>
        {expanded.has("overview") && (
          <div className="px-4 pb-4 border-t border-border">
            <div className="flex items-center gap-2 mt-3 mb-4">
              <Button size="sm" variant="outline" onClick={takeSnapshot} disabled={snapshotting}>
                {snapshotting ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                {snapshotting ? "Snapshotting..." : "Take Snapshot"}
              </Button>
              {latest && <span className="text-xs text-dim">Last: {new Date(latest.snapshot_date).toLocaleDateString()}</span>}
            </div>
            {latest ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Organic Traffic", value: latest.organic_traffic?.toLocaleString() },
                  { label: "Keywords", value: latest.organic_keywords?.toLocaleString() },
                  { label: "Domain Rank", value: String(latest.rank || "—") },
                  { label: "Backlinks", value: latest.backlinks?.toLocaleString() },
                  { label: "Referring Domains", value: latest.referring_domains?.toLocaleString() },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-2 rounded-md p-3">
                    <div className="text-[10px] text-dim uppercase tracking-wide">{s.label}</div>
                    <div className="text-lg font-bold text-foreground">{s.value || "—"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-dim">No snapshots yet. Click "Take Snapshot" to pull current data.</div>
            )}
          </div>
        )}
      </div>

      {/* Top Keywords */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle("keywords")} className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-foreground">Ranked Keywords</span>
            <span className="text-xs text-dim">{keywords.length} keywords</span>
          </div>
          {expanded.has("keywords") ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
        </button>
        {expanded.has("keywords") && (
          <div className="border-t border-border max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[10px] text-dim uppercase tracking-wide border-b border-border">
                <th className="text-left px-3 py-1.5">Keyword</th>
                <th className="text-right px-3 py-1.5 w-16">Pos</th>
                <th className="text-right px-3 py-1.5 w-20">Volume</th>
                <th className="text-left px-3 py-1.5">URL</th>
              </tr></thead>
              <tbody>{keywords.map((kw, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-3 py-1.5 text-foreground">{kw.keyword}</td>
                  <td className="px-3 py-1.5 text-right"><span className={cn("font-medium",
                    kw.position <= 3 ? "text-green-400" : kw.position <= 10 ? "text-blue-400" : kw.position <= 20 ? "text-amber-400" : "text-dim"
                  )}>{kw.position}</span></td>
                  <td className="px-3 py-1.5 text-right text-dim">{kw.searchVolume?.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-xs text-dim truncate max-w-[200px]">{kw.url?.replace(/^https?:\/\/[^/]+/, "")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technical Audit */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle("audit")} className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">Technical Audit</span>
            {auditHistory.length > 0 && <span className="text-xs text-dim">{auditHistory.length} pages audited</span>}
          </div>
          {expanded.has("audit") ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
        </button>
        {expanded.has("audit") && (
          <div className="px-4 pb-4 border-t border-border">
            <div className="flex items-center gap-2 mt-3 mb-4">
              <Button size="sm" variant="outline" onClick={runAudit} disabled={auditing}>
                {auditing ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <FileSearch className="h-3 w-3 mr-1" />}
                {auditing ? "Auditing..." : "Run Audit"}
              </Button>
            </div>
            {auditHistory.length > 0 ? (
              <div className="space-y-2">
                {auditHistory.slice(0, 10).map((a, i) => {
                  const score = a.onpageScore ?? a.onpage_score ?? 0;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm border-b border-border/30 pb-2">
                      <span className={cn("text-xs font-bold w-10 text-center",
                        score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400"
                      )}>{score}</span>
                      <span className="text-foreground truncate flex-1">{a.url?.replace(/^https?:\/\/[^/]+/, "") || a.url}</span>
                      <span className="text-xs text-dim">{(a.loadTime ?? a.load_time ?? 0).toFixed(1)}s</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-dim">No audit data yet. Click "Run Audit" to analyze the homepage.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
