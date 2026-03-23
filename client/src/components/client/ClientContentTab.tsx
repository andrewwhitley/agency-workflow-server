import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText, PenTool, RefreshCw, ExternalLink, ChevronDown, ChevronRight,
  Plus, Sparkles, Globe, Calendar, BookOpen,
} from "lucide-react";

interface ContentStatus {
  hasProfile: boolean;
  hasFulfillmentFolder: boolean;
  hasPlanningSheet: boolean;
  hasOutputFolder: boolean;
}

interface PlanPage {
  title: string;
  slug: string;
  type: string;
  status?: string;
  metaTitle?: string;
}

interface GenerationResult {
  title: string;
  status: string;
  slug?: string;
  error?: string;
}

export function ClientContentTab({ clientSlug }: { clientSlug: string }) {
  const [status, setStatus] = useState<ContentStatus | null>(null);
  const [pages, setPages] = useState<PlanPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResults, setGenResults] = useState<GenerationResult[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["status", "pages"]));

  const toggle = (key: string) => setExpanded((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const reload = useCallback(() => {
    Promise.all([
      api<ContentStatus>(`/content-management/clients/${clientSlug}/status`).catch(() => null),
      api<PlanPage[]>(`/content-management/clients/${clientSlug}/plan`).catch(() => []),
    ]).then(([s, p]) => { setStatus(s); setPages(p); })
      .finally(() => setLoading(false));
  }, [clientSlug]);

  useEffect(() => { reload(); }, [reload]);

  const generateContent = async (type: string, dryRun: boolean = false) => {
    setGenerating(true);
    setGenResults([]);
    try {
      const result = await api<{ results: GenerationResult[] }>(`/content-management/clients/${clientSlug}/generate`, {
        method: "POST",
        body: JSON.stringify({ contentType: type, dryRun }),
      });
      setGenResults(result.results || []);
      reload();
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  if (loading) return <div className="text-sm text-dim">Loading content...</div>;

  const pagesByType: Record<string, PlanPage[]> = {};
  for (const p of pages) {
    const t = p.type || "other";
    if (!pagesByType[t]) pagesByType[t] = [];
    pagesByType[t].push(p);
  }

  const typeLabels: Record<string, string> = {
    "website-page": "Website Pages",
    "blog-post": "Blog Posts",
    "gbp-post": "Google Business Posts",
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle("status")} className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Content Factory</span>
          </div>
          {expanded.has("status") ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
        </button>
        {expanded.has("status") && (
          <div className="px-4 pb-4 border-t border-border">
            {status && (
              <div className="flex flex-wrap gap-2 mt-3 mb-4">
                {[
                  { label: "Content Profile", ok: status.hasProfile },
                  { label: "Fulfillment Folder", ok: status.hasFulfillmentFolder },
                  { label: "Planning Sheet", ok: status.hasPlanningSheet },
                  { label: "Output Folder", ok: status.hasOutputFolder },
                ].map((b) => (
                  <span key={b.label} className={cn("text-xs px-2 py-1 rounded border",
                    b.ok ? "bg-success/10 text-success border-success/20" : "bg-surface-2 text-dim border-border"
                  )}>{b.label}</span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => generateContent("website-page")} disabled={generating}>
                {generating ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Globe className="h-3 w-3 mr-1" />}
                Generate Website Pages
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateContent("blog-post")} disabled={generating}>
                <BookOpen className="h-3 w-3 mr-1" /> Generate Blog Posts
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateContent("website-page", true)} disabled={generating}>
                <FileText className="h-3 w-3 mr-1" /> Dry Run (Preview)
              </Button>
            </div>
            {genResults.length > 0 && (
              <div className="mt-3 space-y-1">
                {genResults.map((r, i) => (
                  <div key={i} className={cn("text-xs px-2 py-1 rounded",
                    r.status === "success" ? "bg-success/10 text-success" :
                    r.status === "skipped" ? "bg-surface-2 text-dim" : "bg-destructive/10 text-destructive"
                  )}>
                    {r.title}: {r.status}{r.error ? ` — ${r.error}` : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Plan / Pages */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle("pages")} className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-foreground">Content Plan</span>
            <span className="text-xs text-dim">{pages.length} pages</span>
          </div>
          {expanded.has("pages") ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
        </button>
        {expanded.has("pages") && (
          <div className="border-t border-border">
            {Object.entries(pagesByType).map(([type, typePages]) => (
              <div key={type}>
                <div className="px-4 py-2 bg-surface-2 text-xs font-bold text-dim uppercase tracking-wide border-b border-border">
                  {typeLabels[type] || type} ({typePages.length})
                </div>
                <div className="divide-y divide-border/30">
                  {typePages.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground">{p.title}</div>
                        {p.slug && <div className="text-xs text-dim">/{p.slug}</div>}
                      </div>
                      {p.status && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0",
                          p.status === "generated" ? "bg-success/10 text-success" :
                          p.status === "planned" ? "bg-blue-500/10 text-blue-400" : "bg-surface-2 text-dim"
                        )}>{p.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {pages.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-dim">
                No content plan yet. Configure the planning sheet or generate content to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
