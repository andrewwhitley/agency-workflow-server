import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface WorkbookClient {
  slug: string;
  name: string;
  hasColors: boolean;
  hasFonts: boolean;
}

interface WorkbookResult {
  title: string;
  url: string;
  documentId: string;
}

export function WorkbooksPage() {
  const [clients, setClients] = useState<WorkbookClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [sourceDocId, setSourceDocId] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<WorkbookResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<WorkbookClient[]>("/workbooks/clients")
      .then((data) => { setClients(data); if (data.length > 0) setSelectedClient(data[0].slug); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!selectedClient || !sourceDocId) return;
    setCreating(true);
    setResult(null);
    setError("");
    try {
      const res = await api<WorkbookResult>("/workbooks/create", {
        method: "POST",
        body: JSON.stringify({ client: selectedClient, sourceDocId, title: title || undefined }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workbook");
    }
    setCreating(false);
  };

  if (loading) return <div className="text-muted">Loading workbook clients...</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Create Branded Workbook</h2>

      <div className="bg-surface border border-border rounded-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Client</label>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
            {clients.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1">Source Google Doc URL or ID</label>
          <input value={sourceDocId} onChange={(e) => setSourceDocId(e.target.value)}
            placeholder="https://docs.google.com/document/d/... or document ID"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1">Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave blank to use source doc title"
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        </div>

        <button onClick={create} disabled={creating || !sourceDocId}
          className={cn("w-full py-2.5 rounded-md text-sm font-medium transition-colors",
            creating || !sourceDocId ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {creating ? "Creating..." : "Create Workbook"}
        </button>

        {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

        {result && (
          <div className="p-4 rounded-md bg-success/10 border border-success/20">
            <div className="text-sm font-medium text-success mb-2">Workbook created!</div>
            <div className="text-sm text-foreground mb-1">{result.title}</div>
            <a href={result.url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-accent hover:underline">Open in Google Docs</a>
            <p className="text-xs text-muted mt-3">
              Note: If images are present, you may need to manually set "Wrap text" on them in Google Docs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
