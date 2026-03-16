import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Deliverable {
  id: number;
  campaignId: number;
  clientId: number;
  title: string;
  deliverableType: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface Campaign {
  id: number;
  campaignName: string;
  clientName: string;
}

const STATUSES = ["not_started", "in_progress", "in_review", "revision", "approved", "live", "completed"];

export function DeliverablesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    api<Campaign[]>("/cm/campaigns").then((camps) => {
      setCampaigns(camps);
      // Fetch deliverables for each campaign
      Promise.all(camps.map((c) =>
        api<Deliverable[]>(`/cm/clients/${c.clientId}/campaign-deliverables`).catch(() => [])
      )).then((results) => {
        setDeliverables(results.flat());
      }).finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter ? deliverables.filter((d) => d.status === filter) : deliverables;
  const getCampaign = (id: number) => campaigns.find((c) => c.id === id);

  if (loading) return <div className="text-muted">Loading deliverables...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Deliverables</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter(null)}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !filter ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          All ({deliverables.length})
        </button>
        {STATUSES.map((s) => {
          const count = deliverables.filter((d) => d.status === s).length;
          if (count === 0) return null;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize", filter === s ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
              {s.replace(/_/g, " ")} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim">Deliverable</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Campaign</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Assigned</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Due</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const camp = getCampaign(d.campaignId);
              return (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 text-foreground font-medium">{d.title}</td>
                  <td className="px-4 py-3 text-muted text-xs">{camp?.campaignName || "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-dim capitalize">{d.deliverableType.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
                      d.status === "completed" || d.status === "live" ? "bg-success/10 text-success" :
                      d.status === "in_progress" || d.status === "in_review" ? "bg-warning/10 text-warning" :
                      "bg-surface-2 text-dim"
                    )}>{d.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs capitalize",
                      d.priority === "urgent" ? "text-destructive" : d.priority === "high" ? "text-warning" : "text-dim"
                    )}>{d.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{d.assignedTo || "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{d.dueDate ? new Date(d.dueDate).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-muted">No deliverables found.</div>}
      </div>
    </div>
  );
}
