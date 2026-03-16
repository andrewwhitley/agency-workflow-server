import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RunRecord {
  id: string;
  workflow: string;
  status: string;
  startedAt: string;
  duration?: number;
  error?: string;
  inputs?: Record<string, unknown>;
  output?: unknown;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function HistoryPage() {
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<RunRecord[]>("/history")
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted">Loading history...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Run History</h2>

      {history.length === 0 ? (
        <p className="text-muted">No workflow runs recorded yet.</p>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Workflow</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Started</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Details</th>
              </tr>
            </thead>
            <tbody>
              {history.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-xs font-medium",
                        run.status === "completed" && "bg-success/10 text-success",
                        run.status === "failed" && "bg-destructive/10 text-destructive",
                        run.status === "running" && "bg-warning/10 text-warning"
                      )}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{run.workflow}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {run.duration ? formatDuration(run.duration) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {run.error ? (
                      <span className="text-destructive text-xs">{run.error}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
