import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClientSelector } from "@/hooks/useClientSelector";
import { ClientSelector } from "@/components/ClientSelector";

interface AuditResult {
  id?: string;
  url: string;
  status_code?: number;
  statusCode?: number;
  onpage_score?: number;
  onpageScore?: number;
  title?: string;
  description?: string;
  h1?: string[];
  load_time?: number;
  loadTime?: number;
  size?: number;
  broken_links?: number;
  brokenLinks?: number;
  broken_resources?: number;
  brokenResources?: number;
  duplicate_title?: boolean;
  duplicateTitle?: boolean;
  duplicate_description?: boolean;
  duplicateDescription?: boolean;
  audited_at?: string;
  checks?: Record<string, unknown>;
}

export function TechnicalAuditPage() {
  const { clients, slug, setSlug, loading: clientsLoading } = useClientSelector();
  const [url, setUrl] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<AuditResult[]>([]);

  useEffect(() => {
    if (!slug) return;
    api<AuditResult[]>(`/seo/clients/${slug}/audits`).then(setHistory).catch(() => {});
  }, [slug]);

  const runAudit = async () => {
    if (!url) return;
    setAuditing(true);
    setResult(null);
    try {
      const res = await api<AuditResult>(`/seo/clients/${slug}/audit`, {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setResult(res);
      const updated = await api<AuditResult[]>(`/seo/clients/${slug}/audits`);
      setHistory(updated);
    } catch (err) { console.error(err); }
    setAuditing(false);
  };

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  const score = result?.onpage_score ?? result?.onpageScore;
  const statusCode = result?.status_code ?? result?.statusCode;
  const loadTime = result?.load_time ?? result?.loadTime;
  const brokenLinks = result?.broken_links ?? result?.brokenLinks ?? 0;
  const brokenResources = result?.broken_resources ?? result?.brokenResources ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Technical Audit</h2>
        <ClientSelector clients={clients} value={slug} onChange={setSlug} />
      </div>

      {/* Audit input */}
      <div className="flex gap-2 mb-6">
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/page-to-audit"
          onKeyDown={(e) => e.key === "Enter" && runAudit()}
          className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        <button onClick={runAudit} disabled={auditing || !url}
          className={cn("px-4 py-2 rounded-md text-sm font-medium", auditing || !url ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {auditing ? "Auditing..." : "Run Audit"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface border border-border rounded-md p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-xs text-dim uppercase mb-1">Score</div>
              <div className={cn("text-3xl font-bold",
                (score || 0) >= 80 ? "text-success" : (score || 0) >= 50 ? "text-warning" : "text-destructive"
              )}>{score?.toFixed(0) || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-dim uppercase mb-1">Status</div>
              <div className={cn("text-lg font-semibold", statusCode === 200 ? "text-success" : "text-destructive")}>
                {statusCode || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-dim uppercase mb-1">Load Time</div>
              <div className="text-lg font-semibold text-foreground">{loadTime ? `${loadTime.toFixed(2)}s` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-dim uppercase mb-1">Size</div>
              <div className="text-lg font-semibold text-foreground">{result.size ? `${(result.size / 1024).toFixed(0)}KB` : "—"}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs text-dim">Title:</span>
              <p className="text-sm text-foreground">{result.title || "Missing"}</p>
            </div>
            <div>
              <span className="text-xs text-dim">Description:</span>
              <p className="text-sm text-foreground">{result.description || "Missing"}</p>
            </div>
            <div>
              <span className="text-xs text-dim">H1 Tags:</span>
              <p className="text-sm text-foreground">{result.h1?.join(", ") || "None"}</p>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <span className={cn(brokenLinks > 0 ? "text-destructive" : "text-success")}>
              Broken Links: {brokenLinks}
            </span>
            <span className={cn(brokenResources > 0 ? "text-destructive" : "text-success")}>
              Broken Resources: {brokenResources}
            </span>
            <span className={cn(result.duplicate_title || result.duplicateTitle ? "text-warning" : "text-success")}>
              Duplicate Title: {result.duplicate_title || result.duplicateTitle ? "Yes" : "No"}
            </span>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-foreground mb-4">Audit History</h3>
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-4 py-3 font-medium text-dim">URL</th>
                  <th className="text-left px-4 py-3 font-medium text-dim">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-dim">Issues</th>
                  <th className="text-left px-4 py-3 font-medium text-dim">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => {
                  const s = a.onpage_score ?? a.onpageScore ?? 0;
                  const bl = a.broken_links ?? a.brokenLinks ?? 0;
                  const br = a.broken_resources ?? a.brokenResources ?? 0;
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2/50 cursor-pointer"
                      onClick={() => { setUrl(a.url); setResult(a); }}>
                      <td className="px-4 py-3 text-foreground text-xs truncate max-w-[300px]">{a.url}</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-medium", s >= 80 ? "text-success" : s >= 50 ? "text-warning" : "text-destructive")}>
                          {s.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{a.status_code ?? a.statusCode}</td>
                      <td className="px-4 py-3 text-muted">{bl + br} issues</td>
                      <td className="px-4 py-3 text-xs text-dim">{a.audited_at ? new Date(a.audited_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
