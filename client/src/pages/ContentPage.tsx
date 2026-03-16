import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ContentClient {
  slug: string;
  name: string;
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
}

interface PlanningRow {
  id: string;
  row_index: number;
  data: Record<string, string>;
}

const TABS = ["plan", "calendar", "generate", "sheet", "runs", "settings"] as const;
type Tab = typeof TABS[number];

const SHEET_SUBTABS = ["content-tracking", "topical-sitemap", "deliverables", "completed"] as const;

export function ContentPage() {
  const [clients, setClients] = useState<ContentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [tab, setTab] = useState<Tab>("plan");

  useEffect(() => {
    api<ContentClient[]>("/content-management/clients")
      .then((data) => {
        setClients(data);
        if (data.length > 0 && !slug) setSlug(data[0].slug);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted">Loading content manager...</div>;

  const client = clients.find((c) => c.slug === slug);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Content Manager</h2>
        <select value={slug} onChange={(e) => setSlug(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
          {clients.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Status badges */}
      {client && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge ok={client.hasProfile}>Content Profile</Badge>
          <Badge ok={client.hasFulfillmentFolder}>Fulfillment Folder</Badge>
          <Badge ok={client.hasPlanningSheet}>Planning Sheet</Badge>
          <Badge ok={client.hasOutputFolder}>Output Folder</Badge>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {slug && (
        <>
          {tab === "plan" && <PlanTab slug={slug} />}
          {tab === "calendar" && <CalendarTab slug={slug} />}
          {tab === "generate" && <GenerateTab slug={slug} />}
          {tab === "sheet" && <SheetTab slug={slug} />}
          {tab === "runs" && <RunsTab slug={slug} />}
          {tab === "settings" && <SettingsTab slug={slug} />}
        </>
      )}
    </div>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("text-xs px-2 py-1 rounded font-medium",
      ok ? "bg-success/10 text-success" : "bg-surface-2 text-dim")}>
      {ok ? "✓" : "✗"} {children}
    </span>
  );
}

// ── Plan Tab ───────────────────────────────────

function PlanTab({ slug }: { slug: string }) {
  const [pages, setPages] = useState<PlanPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<{ pages: PlanPage[] }>(`/content-management/clients/${slug}/plan`)
      .then((d) => setPages(d.pages || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-muted text-sm">Loading content plan...</div>;

  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="text-left px-4 py-3 font-medium text-dim">Title</th>
            <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
            <th className="text-left px-4 py-3 font-medium text-dim">Slug</th>
            <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-4 py-3 text-foreground">{p.title}</td>
              <td className="px-4 py-3 text-muted">{p.type}</td>
              <td className="px-4 py-3 text-muted font-mono text-xs">{p.slug}</td>
              <td className="px-4 py-3 text-muted">{p.status || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length === 0 && <div className="p-8 text-center text-muted">No content plan available. Ensure the client has a content profile.</div>}
    </div>
  );
}

// ── Calendar Tab ───────────────────────────────

function CalendarTab({ slug }: { slug: string }) {
  const [strategy, setStrategy] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api<{ strategy: string }>(`/content-management/clients/${slug}/strategy`, { method: "POST" });
      setStrategy(res.strategy);
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  return (
    <div>
      <button onClick={generate} disabled={generating}
        className={cn("px-4 py-2 rounded-md text-sm font-medium mb-4", generating ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
        {generating ? "Generating..." : "Generate Editorial Calendar"}
      </button>
      {strategy && (
        <div className="bg-surface border border-border rounded-md p-4">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{strategy}</pre>
        </div>
      )}
    </div>
  );
}

// ── Generate Tab ───────────────────────────────

function GenerateTab({ slug }: { slug: string }) {
  const [pages, setPages] = useState<PlanPage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qaEnabled, setQaEnabled] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<{ pages: PlanPage[] }>(`/content-management/clients/${slug}/plan`)
      .then((d) => setPages(d.pages || []))
      .catch(console.error);
  }, [slug]);

  const toggleAll = () => {
    if (selected.size === pages.length) setSelected(new Set());
    else setSelected(new Set(pages.map((p) => p.slug)));
  };

  const toggle = (s: string) => {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s); else next.add(s);
    setSelected(next);
  };

  const generate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setStatus("Starting generation...");
    try {
      await api(`/content-management/clients/${slug}/generate`, {
        method: "POST",
        body: JSON.stringify({
          pages: Array.from(selected),
          qaEnabled,
        }),
      });
      setStatus("Generation complete!");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={generate} disabled={generating || selected.size === 0}
          className={cn("px-4 py-2 rounded-md text-sm font-medium", generating || selected.size === 0 ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {generating ? "Generating..." : `Generate ${selected.size} page(s)`}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={qaEnabled} onChange={(e) => setQaEnabled(e.target.checked)} />
          QA Review
        </label>
      </div>

      {status && <div className="text-sm text-muted mb-4">{status}</div>}

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={selected.size === pages.length && pages.length > 0} onChange={toggleAll} />
              </th>
              <th className="text-left px-4 py-3 font-medium text-dim">Page</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} />
                </td>
                <td className="px-4 py-3 text-foreground">{p.title}</td>
                <td className="px-4 py-3 text-muted">{p.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sheet Tab ──────────────────────────────────

function SheetTab({ slug }: { slug: string }) {
  const [subtab, setSubtab] = useState<string>("content-tracking");
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api<{ headers: string[]; rows: PlanningRow[] }>(`/content-management/clients/${slug}/planning/${subtab}`)
      .then((d) => { setHeaders(d.headers || []); setRows(d.rows || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, subtab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const importSheet = async () => {
    setImporting(true);
    try {
      await api(`/content-management/clients/${slug}/planning/import`, { method: "POST" });
      fetchData();
    } catch (err) { console.error(err); }
    setImporting(false);
  };

  const syncBack = async () => {
    setSyncing(true);
    try {
      await api(`/content-management/clients/${slug}/planning/sync-back`, { method: "POST" });
    } catch (err) { console.error(err); }
    setSyncing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {SHEET_SUBTABS.map((st) => (
            <button key={st} onClick={() => setSubtab(st)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                subtab === st ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
              {st.replace("-", " ")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={importSheet} disabled={importing}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-muted hover:bg-surface-3">
            {importing ? "Importing..." : "Import from Sheet"}
          </button>
          <button onClick={syncBack} disabled={syncing}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-surface-2 text-muted hover:bg-surface-3">
            {syncing ? "Syncing..." : "Sync Back"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading sheet data...</div>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                {headers.map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-dim text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-2 text-xs text-foreground whitespace-nowrap max-w-[200px] truncate">
                      {row.data[h] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-8 text-center text-muted text-sm">No data. Import from Google Sheet to get started.</div>}
        </div>
      )}
    </div>
  );
}

// ── Runs Tab ───────────────────────────────────

function RunsTab({ slug }: { slug: string }) {
  const [queue, setQueue] = useState<{ pending: number; running: number; completed: number }>({ pending: 0, running: 0, completed: 0 });

  useEffect(() => {
    api<{ pending: number; running: number; completed: number }>("/content-management/queue")
      .then(setQueue)
      .catch(console.error);
  }, [slug]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">Pending</div>
          <div className="text-2xl font-semibold text-warning">{queue.pending}</div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">Running</div>
          <div className="text-2xl font-semibold text-accent">{queue.running}</div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">Completed</div>
          <div className="text-2xl font-semibold text-success">{queue.completed}</div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Tab ───────────────────────────────

function SettingsTab({ slug }: { slug: string }) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Record<string, unknown>>(`/content-management/clients/${slug}`)
      .then((d) => setConfig({
        fulfillmentFolderId: (d.fulfillmentFolderId as string) || "",
        planningSheetId: (d.planningSheetId as string) || "",
        outputFolder: (d.outputFolder as string) || "",
      }))
      .catch(console.error);
  }, [slug]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api(`/content-management/clients/${slug}/config`, {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      setSaved(true);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Fulfillment Folder ID</label>
        <input value={config.fulfillmentFolderId || ""} onChange={(e) => setConfig({ ...config, fulfillmentFolderId: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Planning Sheet ID</label>
        <input value={config.planningSheetId || ""} onChange={(e) => setConfig({ ...config, planningSheetId: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted mb-1">Output Folder ID</label>
        <input value={config.outputFolder || ""} onChange={(e) => setConfig({ ...config, outputFolder: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className={cn("px-4 py-2 rounded-md text-sm font-medium", saving ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-success">Saved!</span>}
      </div>
    </div>
  );
}
