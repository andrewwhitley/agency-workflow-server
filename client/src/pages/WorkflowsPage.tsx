import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Workflow {
  name: string;
  description: string;
  category: string;
  inputs?: Record<string, unknown>;
}

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    api<Workflow[]>("/workflows")
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(workflows.map((w) => w.category))];
  const filtered = filter
    ? workflows.filter((w) => w.category === filter)
    : workflows;

  if (loading) {
    return <div className="text-muted">Loading workflows...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">
        Workflows
      </h2>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            !filter
              ? "bg-accent text-white"
              : "bg-surface-2 text-muted hover:bg-surface-3"
          )}
        >
          All ({workflows.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
              filter === cat
                ? "bg-accent text-white"
                : "bg-surface-2 text-muted hover:bg-surface-3"
            )}
          >
            {cat} ({workflows.filter((w) => w.category === cat).length})
          </button>
        ))}
      </div>

      {/* Workflow cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((wf) => (
          <div
            key={wf.name}
            className="bg-surface border border-border rounded-md p-5 hover:border-border-accent transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                {wf.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-dim capitalize">
                {wf.category}
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {wf.description}
            </p>
            {wf.inputs && Object.keys(wf.inputs).length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs text-dim">
                  Inputs: {Object.keys(wf.inputs).join(", ")}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
