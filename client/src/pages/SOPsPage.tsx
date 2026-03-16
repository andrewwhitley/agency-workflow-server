import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SOP {
  id: string;
  name: string;
  client?: string;
  path?: string;
  contentPreview?: string;
}

interface ParsedSOP {
  title: string;
  steps: { title: string; description: string }[];
}

export function SOPsPage() {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<{ sop: SOP; parsed: ParsedSOP } | null>(null);

  useEffect(() => {
    api<SOP[]>("/sops")
      .then(setSOPs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const viewSteps = async (sop: SOP) => {
    try {
      const parsed = await api<ParsedSOP>(`/sops/${sop.id}/parsed`);
      setViewing({ sop, parsed });
    } catch (err) { console.error(err); }
  };

  const createWorkflow = async (sop: SOP) => {
    try {
      await api(`/sops/${sop.id}/register`, { method: "POST" });
      alert("Workflow created from SOP!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create workflow");
    }
  };

  if (loading) return <div className="text-muted">Loading SOPs...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Standard Operating Procedures</h2>

      {sops.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No SOPs found. Sync Google Drive to discover SOP documents.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sops.map((sop) => (
            <div key={sop.id} className="bg-surface border border-border rounded-md p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">{sop.name}</h3>
              <div className="flex gap-2 text-xs text-dim mb-2">
                {sop.client && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">{sop.client}</span>}
                {sop.path && <span className="px-2 py-0.5 rounded bg-surface-2 truncate max-w-[150px]">{sop.path}</span>}
              </div>
              {sop.contentPreview && (
                <p className="text-xs text-muted mb-3 line-clamp-3">{sop.contentPreview}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => viewSteps(sop)} className="text-xs text-accent hover:underline">View Steps</button>
                <button onClick={() => createWorkflow(sop)} className="text-xs text-success hover:underline">Create Workflow</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Steps Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{viewing.parsed.title || viewing.sop.name}</h3>
            <div className="space-y-3">
              {viewing.parsed.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{step.title}</div>
                    <div className="text-xs text-muted mt-0.5">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setViewing(null)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
