import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

interface IndexedDoc {
  name: string;
  client?: string;
  type: string;
  path?: string;
  contentPreview?: string;
}

export function DrivePage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<IndexedDoc[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ connected: boolean }>("/auth/status").then((d) => setConnected(d.connected)),
      api<IndexedDoc[]>("/index/documents").then(setDocuments).catch(() => {}),
      api<DriveFile[]>("/drive/folders").then(setFiles).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const navigate = async (folderId: string, name: string) => {
    const items = await api<DriveFile[]>(`/drive/files/${folderId}`);
    setFiles(items);
    setBreadcrumbs([...breadcrumbs, { id: folderId, name }]);
  };

  const goBack = async (index: number) => {
    if (index < 0) {
      const items = await api<DriveFile[]>("/drive/folders");
      setFiles(items);
      setBreadcrumbs([]);
    } else {
      const crumb = breadcrumbs[index];
      const items = await api<DriveFile[]>(`/drive/files/${crumb.id}`);
      setFiles(items);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api("/index/sync", { method: "POST" });
      const docs = await api<IndexedDoc[]>("/index/documents");
      setDocuments(docs);
    } catch (err) { console.error(err); }
    setSyncing(false);
  };

  if (loading) return <div className="text-muted">Loading Drive...</div>;

  const clients = [...new Set(documents.filter((d) => d.client).map((d) => d.client!))];
  const sops = documents.filter((d) => d.type === "sop");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Google Drive</h2>
        <button onClick={sync} disabled={syncing}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", syncing ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
          {syncing ? "Syncing..." : "Sync & Index"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">Status</div>
          <div className={cn("text-lg font-semibold", connected ? "text-success" : "text-destructive")}>
            {connected ? "Connected" : "Disconnected"}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">Indexed Docs</div>
          <div className="text-lg font-semibold text-foreground">{documents.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">Clients Found</div>
          <div className="text-lg font-semibold text-foreground">{clients.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4">
          <div className="text-xs text-dim uppercase mb-1">SOPs</div>
          <div className="text-lg font-semibold text-foreground">{sops.length}</div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 mb-4 text-sm">
        <button onClick={() => goBack(-1)} className="text-accent hover:underline">Root</button>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span className="text-dim">/</span>
            <button onClick={() => goBack(i)} className="text-accent hover:underline">{crumb.name}</button>
          </span>
        ))}
      </div>

      {/* File browser */}
      <div className="bg-surface border border-border rounded-md overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim">Name</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Modified</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => {
              const isFolder = f.mimeType === "application/vnd.google-apps.folder";
              return (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-surface-2/50 cursor-pointer"
                  onClick={() => isFolder && navigate(f.id, f.name)}>
                  <td className="px-4 py-3 text-foreground">
                    <span className="mr-2">{isFolder ? "📁" : "📄"}</span>
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{f.mimeType.split(".").pop()}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {files.length === 0 && <div className="p-8 text-center text-muted">No files found.</div>}
      </div>

      {/* Indexed docs */}
      {documents.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-foreground mb-4">Indexed Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {documents.slice(0, 30).map((doc, i) => (
              <div key={i} className="bg-surface border border-border rounded-md p-4">
                <h4 className="text-sm font-medium text-foreground mb-1">{doc.name}</h4>
                <div className="flex gap-2 text-xs text-dim mb-2">
                  <span className="px-2 py-0.5 rounded bg-surface-2">{doc.type}</span>
                  {doc.client && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">{doc.client}</span>}
                </div>
                {doc.contentPreview && (
                  <p className="text-xs text-muted line-clamp-2">{doc.contentPreview}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
